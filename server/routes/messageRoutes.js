const express = require("express");
const Message = require("../models/Message");
const Match = require("../models/Match");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/**
 * @route   GET /api/messages/:matchId
 * @desc    Fetch private 1-on-1 chat history for a match (verifies membership)
 * @access  Protected
 */
router.get("/:matchId", authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const currentUserId = String(req.user.id);

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match conversation not found" });
    }

    if (!match.users.some((u) => String(u) === currentUserId)) {
      return res.status(403).json({ message: "Access denied to private conversation" });
    }

    const messages = await Message.findByMatch(matchId);
    res.json(messages);
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ message: "Server error fetching chat history", error: error.message });
  }
});

/**
 * @route   POST /api/messages/:matchId
 * @desc    Send a message via HTTP REST (instant persistence backup for Socket.io)
 * @access  Protected
 */
router.post("/:matchId", authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { text } = req.body;
    const currentUserId = String(req.user.id);

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text cannot be empty" });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (!match.users.some((u) => String(u) === currentUserId)) {
      return res.status(403).json({ message: "Access denied: cannot message un-matched user" });
    }

    const newMessage = new Message({
      match: matchId,
      sender: currentUserId,
      text: text.trim(),
    });
    await newMessage.save();

    await Match.findByIdAndUpdate(matchId, {
      $set: {
        lastMessage: text.trim(),
        lastMessageAt: new Date(),
      },
    });

    if (req.app.get("io")) {
      const io = req.app.get("io");
      io.to(`match_${matchId}`).emit("receivePrivateMessage", {
        _id: newMessage._id,
        match: matchId,
        sender: currentUserId,
        text: text.trim(),
        createdAt: newMessage.createdAt,
      });
      io.to(`match_${matchId}`).emit("message", {
        _id: newMessage._id,
        match: matchId,
        sender: currentUserId,
        text: text.trim(),
        createdAt: newMessage.createdAt,
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ message: "Error sending message", error: error.message });
  }
});

module.exports = router;
