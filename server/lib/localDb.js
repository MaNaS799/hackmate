const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const SWIPES_FILE = path.join(DATA_DIR, "swipes.json");
const MATCHES_FILE = path.join(DATA_DIR, "matches.json");
const PARTICIPATIONS_FILE = path.join(DATA_DIR, "event_participations.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(file, defaultVal = []) {
  try {
    if (!fs.existsSync(file)) {
      writeData(file, defaultVal);
      return defaultVal;
    }
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return defaultVal;
  }
}

function writeData(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("LocalDb write error to", file, err.message);
  }
}

function generateId() {
  return (
    Math.random().toString(16).substring(2, 10) +
    Math.random().toString(16).substring(2, 10) +
    Math.random().toString(16).substring(2, 10)
  );
}

// 4 Campus Hackathons
const DEFAULT_EVENTS = [
  {
    _id: "event_sih",
    title: "Smart India Hackathon 2026",
    description: "Nationwide 36-hr innovation sprint tackling campus, national and societal challenges.",
    tagline: "Nationwide 36-hr innovation sprint tackling campus, national and societal challenges.",
    date: "Nov 20 - 22, 2026",
    mode: "offline",
    location: "Main Campus Auditorium & Innovation Labs",
    teamSize: 4,
    status: "upcoming",
    type: "hackathon",
    theme: "AI, Web3, Smart Automation & Healthcare",
    color: "from-blue-600 to-indigo-600",
    badge: "Flagship",
    participantsCount: 48,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "event_makeathon",
    title: "Makeathon 3026 (Campus Flagship)",
    description: "Annual 24-hr hardware & software prototype building competition with top tech sponsors.",
    tagline: "Annual 24-hr hardware & software prototype building competition with top tech sponsors.",
    date: "Dec 05 - 06, 2026",
    mode: "offline",
    location: "Science & Technology Complex",
    teamSize: 4,
    status: "upcoming",
    type: "hackathon",
    theme: "Fullstack, IoT, Robotics & Cloud",
    color: "from-violet-600 to-purple-600",
    badge: "Trending",
    participantsCount: 36,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "event_devclash",
    title: "DevClash AI Sprint",
    description: "Build next-generation autonomous AI agents, multimodal LLMs, and intelligent web applications.",
    tagline: "Build next-generation autonomous AI agents, multimodal LLMs, and intelligent web applications.",
    date: "Dec 18, 2026",
    mode: "online",
    location: "Virtual (Discord & Campus Sandbox)",
    teamSize: 3,
    status: "upcoming",
    type: "hackathon",
    theme: "Generative AI, LLMs & Autonomous Agents",
    color: "from-rose-600 to-orange-500",
    badge: "AI Track",
    participantsCount: 29,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "event_cybershield",
    title: "CyberShield Campus Hack",
    description: "Fast-paced security, zero-trust architecture, and secure web application defense hackathon.",
    tagline: "Fast-paced security, zero-trust architecture, and secure web application defense hackathon.",
    date: "Jan 12 - 13, 2027",
    mode: "offline",
    location: "Cybersecurity Center Lab 4",
    teamSize: 3,
    status: "upcoming",
    type: "hackathon",
    theme: "Cybersecurity, Cryptography & DevSecOps",
    color: "from-emerald-600 to-teal-600",
    badge: "Security",
    participantsCount: 21,
    createdAt: new Date().toISOString(),
  },
];

module.exports = {
  getUsers: () => readData(USERS_FILE, []),
  saveUsers: (users) => writeData(USERS_FILE, users),
  getEvents: () => readData(EVENTS_FILE, DEFAULT_EVENTS),
  saveEvents: (events) => writeData(EVENTS_FILE, events),
  getParticipations: () => readData(PARTICIPATIONS_FILE, []),
  saveParticipations: (participations) => writeData(PARTICIPATIONS_FILE, participations),
  getSwipes: () => readData(SWIPES_FILE, []),
  saveSwipes: (swipes) => writeData(SWIPES_FILE, swipes),
  getMatches: () => readData(MATCHES_FILE, []),
  saveMatches: (matches) => writeData(MATCHES_FILE, matches),
  getMessages: () => readData(MESSAGES_FILE, []),
  saveMessages: (messages) => writeData(MESSAGES_FILE, messages),
  DEFAULT_EVENTS,
  generateId,
};
