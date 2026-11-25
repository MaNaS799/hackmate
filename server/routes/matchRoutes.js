const express = require("express");
const Match = require("../models/Match");
const User = require("../models/User");
const Event = require("../models/Event");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/**
 * @route   GET /api/matches
 * @desc    Get all confirmed matches for current student with populated other user & event details
 * @access  Protected
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const currentUserId = String(req.user.id);
    const matches = await Match.find({ users: { $in: [currentUserId] } });

    const populatedMatches = await Promise.all(
      matches.map(async (m) => {
        const matchObj = m.toObject ? m.toObject() : { ...m };
        const otherUserId = (matchObj.users || []).find((u) => String(u) !== currentUserId);

        let otherUser = null;
        if (otherUserId) {
          otherUser = await User.findById(otherUserId);
          if (otherUser) {
            const uObj = otherUser.toObject ? otherUser.toObject() : { ...otherUser };
            delete uObj.password;
            otherUser = uObj;
          }
        }

        let eventDetails = null;
        if (matchObj.event) {
          eventDetails = await Event.findById(matchObj.event);
        }

        return {
          ...matchObj,
          otherUser,
          eventDetails,
        };
      })
    );

    const validMatches = populatedMatches.filter((m) => m.otherUser);
    res.json(validMatches);
  } catch (error) {
    console.error("Get Matches Error:", error);
    res.status(500).json({ message: "Error fetching matches", error: error.message });
  }
});

/**
 * @route   GET /api/matches/:id
 * @desc    Get a specific match details and chat messages
 * @access  Protected
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const currentUserId = String(req.user.id);
    const isParticipant = (match.users || []).some((u) => String(u) === currentUserId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied: You are not authorized to view this match conversation" });
    }

    const otherUserId = (match.users || []).find((u) => String(u) !== currentUserId);
    const otherUser = otherUserId ? await User.findById(otherUserId).select("-password") : null;
    const eventDetails = match.event ? await Event.findById(match.event) : null;
    const messages = await Message.findByMatch(matchId);

    res.json({
      match,
      otherUser,
      eventDetails,
      messages,
    });
  } catch (error) {
    console.error("Get Match By ID Error:", error);
    res.status(500).json({ message: "Error fetching match conversation", error: error.message });
  }
});

/**
 * @route   GET /api/matches/:id/messages
 * @desc    Get messages for a specific match (enforces match verification)
 * @access  Protected
 */
router.get("/:id/messages", authMiddleware, async (req, res) => {
  try {
    const matchId = req.params.id;
    const currentUserId = String(req.user.id);

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match conversation not found" });
    }

    const isParticipant = (match.users || []).some((u) => String(u) === currentUserId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied: You are not a participant in this mutual match" });
    }

    const messages = await Message.findByMatch(matchId);
    res.json(messages);
  } catch (error) {
    console.error("Get Match Messages Error:", error);
    res.status(500).json({ message: "Error fetching messages", error: error.message });
  }
});

/**
 * @route   POST /api/matches/:id/messages
 * @desc    Send a message in a specific match (enforces match verification)
 * @access  Protected
 */
router.post("/:id/messages", authMiddleware, async (req, res) => {
  try {
    const matchId = req.params.id;
    const currentUserId = String(req.user.id);
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text cannot be empty" });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const isParticipant = (match.users || []).some((u) => String(u) === currentUserId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied: You cannot send messages to this match" });
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

    // Broadcast to room via socket if io configured
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
    console.error("Send Match Message Error:", error);
    res.status(500).json({ message: "Error sending message", error: error.message });
  }
});

module.exports = router;
