const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, isAdmin: Boolean(user.isAdmin) },
    process.env.JWT_SECRET || "fallback_secret_key",
    { expiresIn: "7d" }
  );
};

// Helper to validate email domain against configured ALLOWED_EMAIL_DOMAIN (defaults strictly to thapar.edu)
function validateEmailDomain(email) {
  const allowed = process.env.ALLOWED_EMAIL_DOMAIN || "thapar.edu";

  const allowedDomains = allowed
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

  const effectiveAllowed = allowedDomains.length > 0 ? allowedDomains : ["thapar.edu"];

  const emailLower = (email || "").toLowerCase().trim();
  const domain = emailLower.split("@")[1];

  if (!domain) {
    return { valid: false, allowedDomains: effectiveAllowed };
  }

  const isMatch = effectiveAllowed.some((d) => domain === d || domain.endsWith(`.${d}`));
  return { valid: isMatch, allowedDomains: effectiveAllowed };
}

/**
 * @route   POST /api/auth/register
 * @desc    Register a new verified college student
 * @access  Public
 */
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
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
      isAdmin,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide your name, college email, and password." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    // 1. Enforce College-Only email domain (Core Principle 1)
    const domainCheck = validateEmailDomain(email);
    if (!domainCheck.valid) {
      return res.status(400).json({
        message: `Registration restricted to college email domain (@${domainCheck.allowedDomains.join(
          ", @"
        )}). Non-college emails are not permitted.`,
      });
    }

    // 2. Check for existing student profile
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this college email already exists." });
    }

    // 3. Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Format skills & tech stack
    const formattedSkills = Array.isArray(techStack)
      ? techStack
      : Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim()).filter(Boolean)
      : ["React", "Node.js"];

    const formattedRoles = Array.isArray(roles) && roles.length > 0
      ? roles
      : role
      ? [role]
      : ["Fullstack"];

    const userLinks = links || {
      github: github || "",
      linkedin: linkedin || "",
    };

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      branch: branch || "Computer Science (CSE)",
      year: year || "3rd Year",
      role: formattedRoles[0] || "Fullstack",
      roles: formattedRoles,
      skills: formattedSkills,
      techStack: formattedSkills,
      bio: bio || "Excited to collaborate and build high-impact hackathon projects!",
      links: userLinks,
      cgpa: cgpa ? Number(cgpa) : null,
      isAdmin: Boolean(isAdmin || email.toLowerCase().startsWith("admin@")),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`,
      isAvailable: true,
      lookingForTeam: true,
    });

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      message: "Student profile registered successfully",
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        branch: user.branch,
        year: user.year,
        role: user.role,
        roles: user.roles,
        skills: user.skills,
        techStack: user.techStack,
        bio: user.bio,
        links: user.links,
        cgpa: user.cgpa,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        isAvailable: user.isAvailable,
        lookingForTeam: user.lookingForTeam,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate student & return JWT Bearer token
 * @access  Public
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter your college email and password." });
    }

    // Enforce College-Only email domain on login
    const domainCheck = validateEmailDomain(email);
    if (!domainCheck.valid) {
      return res.status(400).json({
        message: `Login restricted to verified college emails (@${domainCheck.allowedDomains.join(
          ", @"
        )}). Non-college emails are not permitted.`,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = generateToken(user);

    res.json({
      message: "Login successful! Welcome back.",
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        branch: user.branch,
        year: user.year,
        role: user.role,
        roles: user.roles || [user.role],
        skills: user.skills || [],
        techStack: user.techStack || user.skills || [],
        bio: user.bio,
        links: user.links || { github: "", linkedin: "" },
        cgpa: user.cgpa,
        isAdmin: Boolean(user.isAdmin),
        avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`,
        isAvailable: user.isAvailable ?? user.lookingForTeam ?? true,
        lookingForTeam: user.lookingForTeam ?? user.isAvailable ?? true,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in student profile
 * @access  Protected
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Get Me Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
