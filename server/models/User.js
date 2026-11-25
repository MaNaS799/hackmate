const mongoose = require("mongoose");
const localDb = require("../lib/localDb");

/**
 * USER SCHEMA (MongoDB / Mongoose + Resilient Local Fallback)
 * ----------------------------------------------------
 * Stores college student profile, branch, year, techStack,
 * roles, academic details (CGPA), links, and availability.
 */
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide your college email"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
    },
    branch: {
      type: String,
      default: "Computer Science (CSE)",
    },
    year: {
      type: String,
      default: "3rd Year",
    },
    role: {
      type: String,
      default: "Fullstack",
    },
    roles: {
      type: [String],
      default: ["Fullstack"],
    },
    skills: {
      type: [String],
      default: [],
    },
    techStack: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: "Excited to build innovative projects at the hackathon!",
      maxlength: 500,
    },
    links: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
    },
    cgpa: {
      type: Number,
      default: null,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    lookingForTeam: {
      type: Boolean,
      default: true,
    },
    events: {
      type: [String],
      default: [],
    },
    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

let MongooseUser;
try {
  MongooseUser = mongoose.model("User");
} catch (e) {
  MongooseUser = mongoose.model("User", UserSchema);
}

function normalizeUserDoc(data = {}) {
  const skills = Array.isArray(data.techStack) && data.techStack.length > 0
    ? data.techStack
    : Array.isArray(data.skills)
    ? data.skills
    : [];

  const roles = Array.isArray(data.roles) && data.roles.length > 0
    ? data.roles
    : data.role
    ? [data.role]
    : ["Fullstack"];

  const role = data.role || roles[0] || "Fullstack";

  const isAvailable = data.isAvailable !== undefined
    ? data.isAvailable
    : data.lookingForTeam !== undefined
    ? data.lookingForTeam
    : true;

  const links = data.links || {
    github: data.github || "",
    linkedin: data.linkedin || "",
  };

  return {
    _id: data._id || localDb.generateId(),
    name: data.name || "",
    email: (data.email || "").toLowerCase().trim(),
    password: data.password || data.passwordHash || "",
    branch: data.branch || "Computer Science (CSE)",
    year: data.year || "3rd Year",
    role,
    roles,
    skills,
    techStack: skills,
    bio: data.bio || "Excited to build innovative projects at the hackathon!",
    links,
    cgpa: data.cgpa !== undefined ? data.cgpa : null,
    isAdmin: Boolean(data.isAdmin),
    isAvailable,
    lookingForTeam: isAvailable,
    events: Array.isArray(data.events) ? data.events : [],
    avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name || "Student")}`,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
  };
}

class UserModel {
  constructor(data = {}) {
    const normalized = normalizeUserDoc(data);
    if (mongoose.connection.readyState === 1) {
      this._mongooseInstance = new MongooseUser(normalized);
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
        console.warn("Mongoose save failed, using local storage fallback:", e.message);
      }
    }
    const users = localDb.getUsers();
    const existingIndex = users.findIndex(
      (u) => String(u._id) === String(this._id) || u.email === this.email
    );
    const userDoc = normalizeUserDoc(this);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...userDoc, updatedAt: new Date() };
    } else {
      users.push(userDoc);
    }
    localDb.saveUsers(users);
    Object.assign(this, userDoc);
    return this;
  }

  static async findOne(query) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongooseUser.findOne(query);
      } catch (e) {
        console.warn("Mongoose findOne failed, checking local database:", e.message);
      }
    }
    const users = localDb.getUsers();
    const found = users.find((u) => {
      if (query.email && u.email?.toLowerCase() === query.email.toLowerCase()) return true;
      if (query._id && String(u._id) === String(query._id)) return true;
      return false;
    });
    return found ? { ...found } : null;
  }

  static find(query = {}) {
    const executeFind = async (excludePassword = false) => {
      if (mongoose.connection.readyState === 1) {
        try {
          let q = MongooseUser.find(query);
          if (excludePassword) q = q.select("-password");
          return await q.sort({ createdAt: -1 });
        } catch (e) {
          console.warn("Mongoose find failed, using local database:", e.message);
        }
      }
      let users = localDb.getUsers();
      if (query.role && query.role !== "All") {
        users = users.filter((u) => u.role === query.role || (u.roles && u.roles.includes(query.role)));
      }
      if (query.skills && query.skills.$regex) {
        const regex = query.skills.$regex;
        users = users.filter((u) => (u.skills || u.techStack || []).some((s) => regex.test(s)));
      }
      return users
        .map((u) => {
          const copy = { ...u };
          if (excludePassword) delete copy.password;
          return copy;
        })
        .reverse();
    };

    return {
      select: (fields) => ({
        sort: () => executeFind(fields.includes("-password")),
        then: (resolve, reject) => executeFind(fields.includes("-password")).then(resolve, reject),
      }),
      sort: () => executeFind(false),
      then: (resolve, reject) => executeFind(false).then(resolve, reject),
    };
  }

  static findById(id) {
    const executeFind = async (excludePassword = false) => {
      if (mongoose.connection.readyState === 1) {
        try {
          let q = MongooseUser.findById(id);
          if (excludePassword) q = q.select("-password");
          return await q;
        } catch (e) {}
      }
      const users = localDb.getUsers();
      const u = users.find((user) => String(user._id) === String(id));
      if (!u) return null;
      const copy = { ...u };
      if (excludePassword) delete copy.password;
      return copy;
    };

    return {
      select: (fields) => executeFind(fields.includes("-password")),
      then: (resolve, reject) => executeFind(false).then(resolve, reject),
    };
  }

  static findByIdAndUpdate(id, update, options = {}) {
    const executeUpdate = async (excludePassword = false) => {
      if (mongoose.connection.readyState === 1) {
        try {
          let q = MongooseUser.findByIdAndUpdate(id, update, options);
          if (excludePassword) q = q.select("-password");
          return await q;
        } catch (e) {}
      }
      const users = localDb.getUsers();
      const index = users.findIndex((user) => String(user._id) === String(id));
      if (index === -1) return null;
      const patch = update.$set || update;
      users[index] = { ...users[index], ...patch, updatedAt: new Date() };
      localDb.saveUsers(users);
      const copy = { ...users[index] };
      if (excludePassword) delete copy.password;
      return copy;
    };

    return {
      select: (fields) => executeUpdate(fields.includes("-password")),
      then: (resolve, reject) => executeUpdate(false).then(resolve, reject),
    };
  }

  static async deleteMany(query = {}) {
    if (mongoose.connection.readyState === 1) {
      try {
        await MongooseUser.deleteMany(query);
      } catch (e) {}
    }
    let users = localDb.getUsers();
    if (Object.keys(query).length === 0) {
      localDb.saveUsers([]);
      return { ok: 1 };
    }
    users = users.filter((u) => {
      if (query.email && u.email === query.email) return false;
      return true;
    });
    localDb.saveUsers(users);
    return { ok: 1 };
  }
}

module.exports = UserModel;
