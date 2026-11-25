const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all students (supports filtering by skill, role, or event)
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const { skill, role, event } = req.query;
    let query = {};

    if (role && role !== "All") {
      query.role = role;
    }

    if (skill && skill.trim() !== "") {
      query.skills = { $regex: new RegExp(skill.trim(), "i") };
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Server error fetching students", error: error.message });
  }
});

// Profile update logic handler
async function handleProfileUpdate(req, res) {
  try {
    const {
      name,
      branch,
      year,
      role,
      roles,
      skills,
      techStack,
      bio,
      links,
      github,
      linkedin,
      cgpa,
      events,
      lookingForTeam,
      isAvailable,
      avatar,
    } = req.body;

    const formattedSkills = Array.isArray(techStack)
      ? techStack
      : Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const formattedRoles = Array.isArray(roles) && roles.length > 0
      ? roles
      : role
      ? [role]
      : undefined;

    const userLinks = links || (github !== undefined || linkedin !== undefined
      ? { github: github || "", linkedin: linkedin || "" }
      : undefined);

    const availability = isAvailable !== undefined ? isAvailable : lookingForTeam;

    const patch = {
      ...(name && { name: name.trim() }),
      ...(branch && { branch: branch.trim() }),
      ...(year && { year }),
      ...(role && { role }),
      ...(formattedRoles !== undefined && { roles: formattedRoles }),
      ...(formattedSkills !== undefined && { skills: formattedSkills, techStack: formattedSkills }),
      ...(bio !== undefined && { bio }),
      ...(userLinks !== undefined && { links: userLinks }),
      ...(cgpa !== undefined && { cgpa: cgpa ? Number(cgpa) : null }),
      ...(events !== undefined && { events: Array.isArray(events) ? events : [events] }),
      ...(availability !== undefined && { isAvailable: availability, lookingForTeam: availability }),
      ...(avatar && { avatar }),
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: patch },
      { new: true }
    ).select("-password");

    res.json({
      message: "Student profile updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error updating profile", error: error.message });
  }
}

/**
 * @route   GET /api/profile or /api/users/profile
 * @desc    Get current student's full profile
 * @access  Protected
 */
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Server error fetching profile", error: error.message });
  }
});

/**
 * @route   PUT /api/users/profile and /api/profile
 * @desc    Update current student's profile
 * @access  Protected
 */
router.put("/profile", authMiddleware, handleProfileUpdate);

module.exports = router;
