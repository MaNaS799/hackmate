const mongoose = require("mongoose");
const localDb = require("../lib/localDb");

const SwipeSchema = new mongoose.Schema(
  {
    swiper: { type: String, required: true, ref: "User" },
    target: { type: String, required: true, ref: "User" },
    swiped: { type: String, ref: "User" }, // alias for target
    event: { type: String, required: true, ref: "Event" },
    direction: { type: String, enum: ["right", "left", "like", "pass"], required: true },
    action: { type: String, enum: ["like", "pass", "right", "left"] }, // alias for direction
  },
  { timestamps: true }
);

// Compound unique index for swipe idempotency
SwipeSchema.index({ swiper: 1, target: 1, event: 1 }, { unique: true });

let MongooseSwipe;
try {
  MongooseSwipe = mongoose.model("Swipe");
} catch (e) {
  MongooseSwipe = mongoose.model("Swipe", SwipeSchema);
}

function normalizeSwipe(data = {}) {
  const targetId = String(data.target || data.swiped);
  const directionVal = data.direction || data.action || "right";
  const normalizedDirection = (directionVal === "like" || directionVal === "right") ? "right" : "left";
  const normalizedAction = normalizedDirection === "right" ? "like" : "pass";

  return {
    _id: data._id || localDb.generateId(),
    swiper: String(data.swiper),
    target: targetId,
    swiped: targetId,
    event: String(data.event),
    direction: normalizedDirection,
    action: normalizedAction,
    createdAt: data.createdAt || new Date(),
  };
}

class SwipeModel {
  constructor(data = {}) {
    const normalized = normalizeSwipe(data);
    if (mongoose.connection.readyState === 1) {
      this._mongooseInstance = new MongooseSwipe(normalized);
      Object.assign(this, this._mongooseInstance.toObject());
      this._id = this._mongooseInstance._id;
    } else {
      Object.assign(this, normalized);
    }
  }

  async save() {
    if (mongoose.connection.readyState === 1 && this._mongooseInstance) {
      try {
        const saved = await this._mongooseInstance.save();
        Object.assign(this, saved.toObject());
        this._id = saved._id;
        return this;
      } catch (e) {
        // Handle MongoDB duplicate key error gracefully for idempotency
        if (e.code === 11000) {
          const existing = await MongooseSwipe.findOne({
            swiper: this.swiper,
            target: this.target,
            event: this.event,
          });
          if (existing) {
            Object.assign(this, existing.toObject());
            return this;
          }
        }
      }
    }
    const swipes = localDb.getSwipes();
    const swipeDoc = normalizeSwipe(this);
    const existingIndex = swipes.findIndex(
      (s) =>
        String(s.swiper) === String(swipeDoc.swiper) &&
        String(s.target || s.swiped) === String(swipeDoc.target) &&
        String(s.event) === String(swipeDoc.event)
    );

    if (existingIndex >= 0) {
      // Idempotent: update direction if already exists
      swipes[existingIndex] = { ...swipes[existingIndex], ...swipeDoc };
    } else {
      swipes.push(swipeDoc);
    }
    localDb.saveSwipes(swipes);
    Object.assign(this, swipeDoc);
    return this;
  }

  static async find(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        const q = { ...query };
        if (q.swiped && !q.target) q.target = q.swiped;
        return await MongooseSwipe.find(q);
      } catch (e) {}
    }
    const swipes = localDb.getSwipes();
    return swipes.filter((s) => {
      if (query.swiper && String(s.swiper) !== String(query.swiper)) return false;
      const targetQuery = query.target || query.swiped;
      if (targetQuery && String(s.target || s.swiped) !== String(targetQuery)) return false;
      if (query.event && String(s.event) !== String(query.event)) return false;
      if (query.direction) {
        const d = (s.direction === "like" || s.direction === "right") ? "right" : "left";
        const qd = (query.direction === "like" || query.direction === "right") ? "right" : "left";
        if (d !== qd) return false;
      }
      if (query.action) {
        const a = (s.action === "like" || s.direction === "right" || s.action === "right") ? "like" : "pass";
        const qa = (query.action === "like" || query.action === "right") ? "like" : "pass";
        if (a !== qa) return false;
      }
      return true;
    });
  }

  static async findOne(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        const q = { ...query };
        if (q.swiped && !q.target) q.target = q.swiped;
        return await MongooseSwipe.findOne(q);
      } catch (e) {}
    }
    const swipes = localDb.getSwipes();
    return swipes.find((s) => {
      if (query.swiper && String(s.swiper) !== String(query.swiper)) return false;
      const targetQuery = query.target || query.swiped;
      if (targetQuery && String(s.target || s.swiped) !== String(targetQuery)) return false;
      if (query.event && String(s.event) !== String(query.event)) return false;
      if (query.direction) {
        const d = (s.direction === "like" || s.direction === "right") ? "right" : "left";
        const qd = (query.direction === "like" || query.direction === "right") ? "right" : "left";
        if (d !== qd) return false;
      }
      if (query.action) {
        const a = (s.action === "like" || s.direction === "right" || s.action === "right") ? "like" : "pass";
        const qa = (query.action === "like" || query.action === "right") ? "like" : "pass";
        if (a !== qa) return false;
      }
      return true;
    }) || null;
  }

  static async deleteOne(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        await MongooseSwipe.deleteOne(query);
      } catch (e) {}
    }
    let swipes = localDb.getSwipes();
    const targetQ = query.target || query.swiped;
    const index = swipes.findIndex((s) => {
      if (query._id && String(s._id) === String(query._id)) return true;
      if (
        query.swiper &&
        String(s.swiper) === String(query.swiper) &&
        query.event &&
        String(s.event) === String(query.event) &&
        (targetQ ? String(s.target || s.swiped) === String(targetQ) : true)
      ) {
        return true;
      }
      return false;
    });
    if (index >= 0) {
      swipes.splice(index, 1);
      localDb.saveSwipes(swipes);
    }
    return { ok: 1 };
  }

  static async deleteMany(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        await MongooseSwipe.deleteMany(query);
      } catch (e) {}
    }
    let swipes = localDb.getSwipes();
    if (query.swiper) {
      swipes = swipes.filter((s) => String(s.swiper) !== String(query.swiper));
    } else {
      swipes = [];
    }
    localDb.saveSwipes(swipes);
    return { ok: 1 };
  }
}

module.exports = SwipeModel;
