const mongoose = require("mongoose");
const localDb = require("../lib/localDb");

const MatchSchema = new mongoose.Schema(
  {
    users: [{ type: String, required: true, ref: "User" }],
    event: { type: String, required: true, ref: "Event" },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index on sorted user pair + event
MatchSchema.index({ users: 1, event: 1 }, { unique: true });

let MongooseMatch;
try {
  MongooseMatch = mongoose.model("Match");
} catch (e) {
  MongooseMatch = mongoose.model("Match", MatchSchema);
}

function normalizeMatch(data = {}) {
  const users = (data.users || []).map(String).sort();
  return {
    _id: data._id || localDb.generateId(),
    users,
    event: String(data.event),
    lastMessage: data.lastMessage || "",
    lastMessageAt: data.lastMessageAt || new Date(),
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
  };
}

class MatchModel {
  constructor(data = {}) {
    const normalized = normalizeMatch(data);
    if (mongoose.connection.readyState === 1) {
      this._mongooseInstance = new MongooseMatch(normalized);
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
        // If already exists due to unique constraint, return existing match
        if (e.code === 11000) {
          const existing = await MongooseMatch.findOne({
            users: this.users,
            event: this.event,
          });
          if (existing) {
            Object.assign(this, existing.toObject());
            return this;
          }
        }
      }
    }
    const matches = localDb.getMatches();
    const matchDoc = normalizeMatch(this);
    const existingIndex = matches.findIndex(
      (m) =>
        (String(m._id) === String(matchDoc._id)) ||
        (m.users &&
          m.users.length === 2 &&
          matchDoc.users.length === 2 &&
          m.users[0] === matchDoc.users[0] &&
          m.users[1] === matchDoc.users[1] &&
          String(m.event) === String(matchDoc.event))
    );

    if (existingIndex >= 0) {
      matches[existingIndex] = { ...matches[existingIndex], ...matchDoc, updatedAt: new Date() };
    } else {
      matches.push(matchDoc);
    }
    localDb.saveMatches(matches);
    Object.assign(this, matchDoc);
    return this;
  }

  static async find(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        const matches = await MongooseMatch.find(query).sort({ updatedAt: -1, createdAt: -1 });
        if (matches && matches.length > 0) return matches;
      } catch (e) {}
    }
    const matches = localDb.getMatches();
    return matches
      .filter((m) => {
        if (query.users && query.users.$in) {
          return m.users.some((u) => query.users.$in.includes(String(u)));
        }
        if (query.users && query.users.$all) {
          const [u1, u2] = query.users.$all.map(String);
          return m.users.includes(u1) && m.users.includes(u2);
        }
        if (query.event) {
          return String(m.event) === String(query.event);
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  static async findById(id) {
    if (mongoose.connection.readyState === 1) {
      try {
        const m = await MongooseMatch.findById(id);
        if (m) return m;
      } catch (e) {}
    }
    const matches = localDb.getMatches();
    return matches.find((m) => String(m._id) === String(id)) || null;
  }

  static async findOne(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        const m = await MongooseMatch.findOne(query);
        if (m) return m;
      } catch (e) {}
    }
    const matches = localDb.getMatches();
    return matches.find((m) => {
      if (query.users && query.users.$all) {
        const [u1, u2] = query.users.$all.map(String);
        const matchUsers = (m.users || []).map(String);
        const hasUsers = matchUsers.includes(u1) && matchUsers.includes(u2);
        if (query.event) {
          return hasUsers && String(m.event) === String(query.event);
        }
        return hasUsers;
      }
      if (query._id && String(m._id) === String(query._id)) return true;
      return false;
    }) || null;
  }

  static async findByIdAndUpdate(id, update) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseMatch.findByIdAndUpdate(id, update, { new: true });
      } catch (e) {}
    }
    const matches = localDb.getMatches();
    const idx = matches.findIndex((m) => String(m._id) === String(id));
    if (idx === -1) return null;
    const patch = update.$set || update;
    matches[idx] = { ...matches[idx], ...patch, updatedAt: new Date() };
    localDb.saveMatches(matches);
    return matches[idx];
  }

  static async deleteOne(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        await MongooseMatch.deleteOne(query);
      } catch (e) {}
    }
    let matches = localDb.getMatches();
    const idx = matches.findIndex((m) => {
      if (query._id && String(m._id) === String(query._id)) return true;
      if (query.event && String(m.event) !== String(query.event)) return false;
      const pair = query["users.$all"] || (query.users && query.users.$all) || (Array.isArray(query.users) ? query.users : null);
      if (pair && Array.isArray(pair)) {
        return m.users && pair.every((u) => m.users.includes(String(u)));
      }
      return false;
    });
    if (idx >= 0) {
      matches.splice(idx, 1);
      localDb.saveMatches(matches);
    }
    return { ok: 1 };
  }

  static async deleteMany(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        await MongooseMatch.deleteMany(query);
      } catch (e) {}
    }
    let matches = localDb.getMatches();
    if (Object.keys(query).length === 0) {
      localDb.saveMatches([]);
      return { ok: 1 };
    }
    matches = matches.filter((m) => {
      if (query.event && String(m.event) === String(query.event)) return false;
      return true;
    });
    localDb.saveMatches(matches);
    return { ok: 1 };
  }
}

module.exports = MatchModel;
