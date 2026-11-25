const mongoose = require("mongoose");
const localDb = require("../lib/localDb");

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    tagline: { type: String, default: "" },
    date: { type: String, default: "" },
    mode: { type: String, enum: ["online", "offline"], default: "offline" },
    location: { type: String, default: "Campus" },
    teamSize: { type: Number, default: 4 },
    status: { type: String, enum: ["upcoming", "closed"], default: "upcoming" },
    type: { type: String, default: "hackathon" },
    theme: { type: String, default: "" },
    color: { type: String, default: "from-indigo-600 to-blue-600" },
    badge: { type: String, default: "Hackathon" },
    participantsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

let MongooseEvent;
try {
  MongooseEvent = mongoose.model("Event");
} catch (e) {
  MongooseEvent = mongoose.model("Event", EventSchema);
}

function normalizeEventDoc(data = {}) {
  return {
    _id: data._id || localDb.generateId(),
    title: data.title || "",
    description: data.description || data.tagline || "",
    tagline: data.tagline || data.description || "",
    date: data.date || "Upcoming",
    mode: data.mode || "offline",
    location: data.location || "Campus",
    teamSize: Number(data.teamSize) || 4,
    status: data.status || "upcoming",
    type: data.type || "hackathon",
    theme: data.theme || "",
    color: data.color || "from-indigo-600 to-blue-600",
    badge: data.badge || "Hackathon",
    participantsCount: Number(data.participantsCount) || 0,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
  };
}

class EventModel {
  constructor(data = {}) {
    const normalized = normalizeEventDoc(data);
    if (mongoose.connection.readyState === 1) {
      this._mongooseInstance = new MongooseEvent(normalized);
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
      } catch (e) {}
    }
    const events = localDb.getEvents();
    const eventDoc = normalizeEventDoc(this);
    const existingIndex = events.findIndex((e) => String(e._id) === String(this._id));
    if (existingIndex >= 0) {
      events[existingIndex] = { ...events[existingIndex], ...eventDoc, updatedAt: new Date() };
    } else {
      events.push(eventDoc);
    }
    localDb.saveEvents(events);
    Object.assign(this, eventDoc);
    return this;
  }

  static async find(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        const events = await MongooseEvent.find(query).sort({ createdAt: -1 });
        if (events && events.length > 0) return events;
      } catch (e) {}
    }
    let events = localDb.getEvents();
    if (query.status) {
      events = events.filter((e) => e.status === query.status);
    }
    if (query.type) {
      events = events.filter((e) => e.type === query.type);
    }
    return events;
  }

  static async findById(id) {
    if (mongoose.connection.readyState === 1) {
      try {
        const ev = await MongooseEvent.findById(id);
        if (ev) return ev;
      } catch (e) {}
    }
    const events = localDb.getEvents();
    return events.find((e) => String(e._id) === String(id)) || null;
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseEvent.findByIdAndUpdate(id, update, { new: true, ...options });
      } catch (e) {}
    }
    const events = localDb.getEvents();
    const index = events.findIndex((e) => String(e._id) === String(id));
    if (index === -1) return null;
    const patch = update.$set || update;
    events[index] = { ...events[index], ...patch, updatedAt: new Date() };
    localDb.saveEvents(events);
    return events[index];
  }

  static async deleteMany(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        await MongooseEvent.deleteMany(query);
      } catch (e) {}
    }
    localDb.saveEvents([]);
    return { ok: 1 };
  }
}

module.exports = EventModel;
