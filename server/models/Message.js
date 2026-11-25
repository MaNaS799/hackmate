const mongoose = require("mongoose");
const localDb = require("../lib/localDb");

/**
 * MESSAGE SCHEMA (MongoDB / Mongoose + Resilient Local Fallback)
 * ----------------------------------------------------
 * Stores real-time chat messages tied to an authenticated mutual match.
 */
const MessageSchema = new mongoose.Schema(
  {
    match: {
      type: String,
      required: true,
      index: true,
      ref: "Match",
    },
    sender: {
      type: String,
      required: true,
      ref: "User",
    },
    text: {
      type: String,
      required: [true, "Message text cannot be empty"],
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

let MongooseMessage;
try {
  MongooseMessage = mongoose.model("Message");
} catch (e) {
  MongooseMessage = mongoose.model("Message", MessageSchema);
}

function normalizeMessage(data = {}) {
  return {
    _id: data._id || localDb.generateId(),
    match: String(data.match),
    sender: String(data.sender),
    text: (data.text || "").trim(),
    createdAt: data.createdAt || new Date(),
  };
}

class MessageModel {
  constructor(data = {}) {
    const normalized = normalizeMessage(data);
    if (mongoose.connection.readyState === 1) {
      this._mongooseInstance = new MongooseMessage(normalized);
      this._id = this._mongooseInstance._id;
      this.match = String(data.match);
      this.sender = String(data.sender);
      this.text = (data.text || "").trim();
      this.createdAt = new Date();
    } else {
      Object.assign(this, normalized);
    }
  }

  async save() {
    if (mongoose.connection.readyState === 1 && this._mongooseInstance) {
      try {
        const saved = await this._mongooseInstance.save();
        this._id = saved._id;
        return this;
      } catch (e) {
        console.warn("Mongoose message save failed, using local fallback:", e.message);
      }
    }
    const messages = localDb.getMessages();
    const doc = normalizeMessage(this);
    messages.push(doc);
    localDb.saveMessages(messages);
    Object.assign(this, doc);
    return this;
  }

  static async findByMatch(matchId) {
    if (mongoose.connection.readyState === 1) {
      try {
        const msgs = await MongooseMessage.find({ match: String(matchId) })
          .sort({ createdAt: 1 })
          .limit(200);
        if (msgs && msgs.length > 0) return msgs;
      } catch (e) {}
    }
    const messages = localDb.getMessages();
    return messages
      .filter((m) => String(m.match) === String(matchId))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  static async find(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseMessage.find(query).sort({ createdAt: 1 });
      } catch (e) {}
    }
    const messages = localDb.getMessages();
    return messages.filter((m) => {
      for (const key of Object.keys(query)) {
        if (String(m[key]) !== String(query[key])) return false;
      }
      return true;
    });
  }

  static async deleteMany(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        await MongooseMessage.deleteMany(query);
      } catch (e) {}
    }
    let messages = localDb.getMessages();
    if (query.match) {
      messages = messages.filter((m) => String(m.match) !== String(query.match));
    } else {
      messages = [];
    }
    localDb.saveMessages(messages);
    return { ok: 1 };
  }
}

module.exports = MessageModel;
