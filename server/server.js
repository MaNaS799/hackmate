const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dns = require("dns");
require("dotenv").config();

// Ensure reliable DNS resolution for MongoDB Atlas SRV connection strings on Windows
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const Message = require("./models/Message");
const Match = require("./models/Match");
const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const swipeRoutes = require("./routes/swipeRoutes");
const matchRoutes = require("./routes/matchRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");

// 1. Initialize Express App & HTTP Server
const app = express();
const server = http.createServer(app);

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});
app.set("io", io);

// 4. Connect to MongoDB (with graceful fallback to local storage)
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hackmate";
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected successfully!");
  })
  .catch((err) => {
    console.warn("⚠️ MongoDB Connection Note:", err.message);
    console.log("⚡ Resilient Local Database Active — ready for presentation & testing!");
  });

const path = require("path");
const fs = require("fs");

// 5. REST API Routes
app.get("/api", (req, res) => {
  res.json({
    name: "HackMate API",
    status: "online",
    version: "1.0.0",
    description: "College-Exclusive Hackathon Teammate Matching Platform",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/swipes", swipeRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", userRoutes); // Maps GET/PUT /api/profile

// 5.1 Serve Static Frontend in Production (Single-Service Fullstack Deployment)
const clientDist = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      name: "HackMate API",
      status: "online",
      version: "1.0.0",
      description: "College-Exclusive Hackathon Teammate Matching Platform",
      note: "Run `npm run build` in root to build the frontend for production deployment."
    });
  });
}

// 6. Socket.io Real-Time Event Handlers for 1-on-1 Matches
io.on("connection", (socket) => {
  // Join user's personal notification room (for instant match celebrations)
  socket.on("joinUser", (userId) => {
    if (!userId) return;
    socket.join(`user_${userId}`);
  });

  // Join private room for a specific match (with verification)
  const handleJoinMatch = async (data) => {
    try {
      const matchId = typeof data === "object" ? data.matchId : data;
      const userId = typeof data === "object" ? data.userId : null;
      if (!matchId) return;

      if (userId) {
        const match = await Match.findById(matchId);
        if (!match || !match.users.some((u) => String(u) === String(userId))) {
          socket.emit("error", { message: "Unauthorized to join this match room" });
          return;
        }
      }

      const room = `match_${matchId}`;
      socket.join(room);
    } catch (err) {
      console.error("joinMatch socket error:", err.message);
    }
  };

  socket.on("join", handleJoinMatch);
  socket.on("joinMatch", handleJoinMatch);

  // Leave room
  socket.on("leaveMatch", (matchId) => {
    if (!matchId) return;
    const room = `match_${matchId}`;
    socket.leave(room);
  });

  // Typing indicator
  socket.on("typing", (data) => {
    const { matchId, senderId, isTyping } = data || {};
    if (!matchId) return;
    socket.to(`match_${matchId}`).emit("typing", { senderId, isTyping });
  });

  // Real-Time 1-on-1 message in matched room (Strictly checks match membership!)
  const handleSendMessage = async (data) => {
    try {
      const { matchId, senderId, text } = data;
      if (!matchId || !senderId || !text || !text.trim()) return;

      // 1. Verify match exists and sender is participant
      const match = await Match.findById(matchId);
      if (!match) {
        socket.emit("error", { message: "Match not found" });
        return;
      }
      if (!match.users.some((u) => String(u) === String(senderId))) {
        socket.emit("error", { message: "Unauthorized: You are not part of this match" });
        return;
      }

      // 2. Save message
      const newMessage = new Message({
        match: String(matchId),
        sender: String(senderId),
        text: text.trim(),
      });
      await newMessage.save();

      // 3. Update match lastMessage
      await Match.findByIdAndUpdate(matchId, {
        $set: {
          lastMessage: text.trim(),
          lastMessageAt: new Date(),
        },
      });

      // 4. Populate sender info
      const senderUser = await User.findById(senderId).select("-password");
      const payload = {
        _id: newMessage._id,
        match: matchId,
        sender: senderId,
        text: text.trim(),
        createdAt: newMessage.createdAt || new Date(),
        senderDetails: senderUser
          ? {
              name: senderUser.name,
              avatar: senderUser.avatar,
              role: senderUser.role,
              branch: senderUser.branch,
            }
          : null,
      };

      // 5. Emit to room
      const room = `match_${matchId}`;
      io.to(room).emit("receivePrivateMessage", payload);
      io.to(room).emit("message", payload);

      // Notify match activity for list update
      io.emit("matchActivity", { matchId, lastMessage: text.trim() });
    } catch (err) {
      console.error("socket sendMessage error:", err.message);
    }
  };

  socket.on("sendPrivateMessage", handleSendMessage);
  socket.on("message", handleSendMessage);

  socket.on("disconnect", () => {});
});

// 7. Start Server if executed directly
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, async () => {
    console.log(`🚀 Hackmate Server running on http://localhost:${PORT}`);
    
    // Auto-seed if local database has 0 users so it works with zero setup!
    const localDb = require("./lib/localDb");
    if (localDb.getUsers().length === 0) {
      console.log("🌱 Fresh database detected: auto-seeding sample hackathons & student profiles...");
      try {
        const seedDatabase = require("./seed");
        await seedDatabase();
      } catch (err) {
        console.warn("Auto-seed note:", err.message);
      }
    }
  });
}

module.exports = { app, server };
