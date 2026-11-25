const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * JWT AUTHENTICATION MIDDLEWARE
 * ----------------------------------------------------
 * Extracts Bearer token, verifies using JWT_SECRET,
 * and attaches decoded user payload to req.user.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");

    req.user = decoded;

    // Attach user record info if needed
    if (!req.user.isAdmin) {
      const userDoc = await User.findById(decoded.id);
      if (userDoc) {
        req.user.isAdmin = Boolean(userDoc.isAdmin);
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid or expired" });
  }
};

/**
 * ADMIN ONLY MIDDLEWARE
 * ----------------------------------------------------
 * Ensures only users with isAdmin === true can create/edit events.
 */
const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Server authorization error" });
  }
};

module.exports = authMiddleware;
module.exports.adminMiddleware = adminMiddleware;
