const mongoose = require("mongoose");
const localDb = require("../lib/localDb");

const EventParticipationSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
      ref: "User",
    },
    event: {
      type: String,
      required: true,
      ref: "Event",
    },
    note: {
      type: String,
      default: "",
      maxlength: 300,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to guarantee unique user+event participation
EventParticipationSchema.index({ user: 1, event: 1 }, { unique: true });

let MongooseParticipation;
try {
  MongooseParticipation = mongoose.model("EventParticipation");
} catch (e) {
  MongooseParticipation = mongoose.model("EventParticipation", EventParticipationSchema);
}

class EventParticipationModel {
  constructor(data = {}) {
    if (mongoose.connection.readyState === 1) {
      this._mongooseInstance = new MongooseParticipation(data);
      Object.assign(this, this._mongooseInstance.toObject());
      this._id = this._mongooseInstance._id;
    } else {
      this._id = data._id || localDb.generateId();
      this.user = String(data.user);
      this.event = String(data.event);
      this.note = data.note || "";
      this.joinedAt = data.joinedAt || new Date();
      this.createdAt = data.createdAt || new Date();
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
        console.warn("Mongoose save failed, using local storage fallback:", e.message);
      }
    }
    const participations = localDb.getParticipations();
    const existingIndex = participations.findIndex(
      (p) => String(p.user) === String(this.user) && String(p.event) === String(this.event)
    );
    const doc = {
      _id: this._id,
      user: String(this.user),
      event: String(this.event),
      note: this.note || "",
      joinedAt: this.joinedAt || new Date(),
      createdAt: this.createdAt || new Date(),
    };
    if (existingIndex >= 0) {
      participations[existingIndex] = { ...participations[existingIndex], ...doc };
    } else {
      participations.push(doc);
    }
    localDb.saveParticipations(participations);
    Object.assign(this, doc);
    return this;
  }

  static async find(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseParticipation.find(query);
      } catch (e) {}
    }
    const participations = localDb.getParticipations();
    return participations.filter((p) => {
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && String(p[key]) !== String(query[key])) {
          return false;
        }
      }
      return true;
    });
  }

  static async findOne(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseParticipation.findOne(query);
      } catch (e) {}
    }
    const participations = localDb.getParticipations();
    return participations.find((p) => {
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && String(p[key]) !== String(query[key])) {
          return false;
        }
      }
      return true;
    }) || null;
  }

  static async deleteOne(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseParticipation.deleteOne(query);
      } catch (e) {}
    }
    let participations = localDb.getParticipations();
    const prevLen = participations.length;
    participations = participations.filter((p) => {
      let match = true;
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && String(p[key]) !== String(query[key])) {
          match = false;
          break;
        }
      }
      return !match;
    });
    localDb.saveParticipations(participations);
    return { deletedCount: prevLen - participations.length };
  }

  static async deleteMany(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseParticipation.deleteMany(query);
      } catch (e) {}
    }
    let participations = localDb.getParticipations();
    if (Object.keys(query).length === 0) {
      const deletedCount = participations.length;
      localDb.saveParticipations([]);
      return { deletedCount };
    }
    const prevLen = participations.length;
    participations = participations.filter((p) => {
      for (const key of Object.keys(query)) {
        if (query[key] !== undefined && String(p[key]) === String(query[key])) {
          return false;
        }
      }
      return true;
    });
    localDb.saveParticipations(participations);
    return { deletedCount: prevLen - participations.length };
  }
}

module.exports = EventParticipationModel;
