const express = require("express");
const Swipe = require("../models/Swipe");
const Match = require("../models/Match");
const User = require("../models/User");
const Event = require("../models/Event");
const EventParticipation = require("../models/EventParticipation");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/**
 * @route   GET /api/swipes/feed
 * @desc    Get candidate profiles for the given event, excluding already swiped profiles
 * @access  Protected
 */
router.get("/feed", authMiddleware, async (req, res) => {
  try {
    const { eventId, role, skill } = req.query;
    const currentUserId = String(req.user.id);

    // 1. Fetch current user's past swipes for this event
    const userSwipes = await Swipe.find({
      swiper: currentUserId,
      ...(eventId ? { event: String(eventId) } : {}),
    });
    const swipedUserIds = new Set(userSwipes.map((s) => String(s.target || s.swiped)));
    swipedUserIds.add(currentUserId); // Don't show self

    // 2. Fetch participations if event specified
    let participationMap = new Map();
    if (eventId) {
      const parts = await EventParticipation.find({ event: String(eventId) });
      parts.forEach((p) => participationMap.set(String(p.user), p));
    }

    // 3. Query candidates
    const allUsers = await User.find({}).select("-password");

    const candidates = allUsers
      .filter((u) => {
        const uid = String(u._id || u.id);
        if (swipedUserIds.has(uid)) return false;
        if (u.isAvailable === false || u.lookingForTeam === false) return false;

        // Filter by event if specified
        if (eventId) {
          const hasJoined = participationMap.has(uid) || (Array.isArray(u.events) && u.events.includes(String(eventId)));
          if (!hasJoined) return false;
        }

        // Filter by role if specified
        if (role && role !== "All") {
          const uRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role];
          if (!uRoles.some((r) => r && r.toLowerCase() === role.toLowerCase())) return false;
        }

        // Filter by skill if specified
        if (skill && skill.trim()) {
          const uSkills = u.techStack || u.skills || [];
          const regex = new RegExp(skill.trim(), "i");
          if (!uSkills.some((s) => regex.test(s))) return false;
        }

        return true;
      })
      .map((u) => {
        const uid = String(u._id || u.id);
        const part = participationMap.get(uid);
        const copy = u.toObject ? u.toObject() : { ...u };
        delete copy.password;
        return {
          ...copy,
          participationNote: part ? part.note : "",
        };
      });

    res.json(candidates);
  } catch (error) {
    console.error("Get Feed Error:", error);
    res.status(500).json({ message: "Error fetching candidate profiles", error: error.message });
  }
});

/**
 * @route   POST /api/swipes
 * @desc    Record a swipe (like/pass or right/left) and detect mutual match
 * @access  Protected
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { swipedId, targetId, eventId, action, direction } = req.body;
    const swiperId = String(req.user.id);
    const actualTargetId = String(targetId || swipedId);
    const rawAction = action || direction;

    if (!actualTargetId || !eventId || !rawAction) {
      return res.status(400).json({ message: "targetId, eventId, and direction are required." });
    }

    if (swiperId === actualTargetId) {
      return res.status(400).json({ message: "You cannot swipe on yourself." });
    }

    const normalizedDirection = (rawAction === "like" || rawAction === "right") ? "right" : "left";

    // 1. Record swipe idempotently
    const swipe = new Swipe({
      swiper: swiperId,
      target: actualTargetId,
      event: String(eventId),
      direction: normalizedDirection,
    });
    await swipe.save();

    // 2. Check for reciprocal like if current action is 'right' / 'like'
    if (normalizedDirection === "right") {
      const otherSwipe = await Swipe.findOne({
        swiper: actualTargetId,
        target: swiperId,
        event: String(eventId),
        direction: "right",
      });

      if (otherSwipe) {
        // Mutual match!
        const sortedPair = [swiperId, actualTargetId].sort();

        let existingMatch = await Match.findOne({
          users: { $all: sortedPair },
          event: String(eventId),
        });

        if (!existingMatch) {
          existingMatch = new Match({
            users: sortedPair,
            event: String(eventId),
            lastMessage: "🎉 Connected as teammates! Say hello 👋",
            lastMessageAt: new Date(),
          });
          await existingMatch.save();
        }

        const matchedUser = await User.findById(actualTargetId).select("-password");
        const eventDoc = await Event.findById(eventId);

        // Emit Socket.io match event to user rooms
        if (req.app.get("io")) {
          const io = req.app.get("io");
          const matchPayload = { match: existingMatch, event: eventDoc, timestamp: new Date() };
          io.to(`user_${swiperId}`).emit("match", { ...matchPayload, matchedUser });
          const swiperUser = await User.findById(swiperId).select("-password");
          io.to(`user_${actualTargetId}`).emit("match", { ...matchPayload, matchedUser: swiperUser });
        }

        return res.json({
          isMatch: true,
          match: existingMatch,
          matchedUser,
          message: "🎉 It's a Mutual Match! You can now chat in private.",
        });
      }
    }

    res.json({
      isMatch: false,
      message: normalizedDirection === "right" ? "Swipe recorded! Waiting for mutual interest." : "Passed profile.",
    });
  } catch (error) {
    console.error("Record Swipe Error:", error);
    res.status(500).json({ message: "Error processing swipe", error: error.message });
  }
});

/**
 * @route   POST /api/swipes/reset
 * @desc    Reset swipes for testing/demoing repeatedly
 * @access  Protected
 */
router.post("/reset", authMiddleware, async (req, res) => {
  try {
    const swiperId = String(req.user.id);
    await Swipe.deleteMany({ swiper: swiperId });
    res.json({ message: "Swipes reset successfully! You can swipe on all profiles again." });
  } catch (error) {
    console.error("Reset Swipes Error:", error);
    res.status(500).json({ message: "Error resetting swipes", error: error.message });
  }
});

module.exports = router;
