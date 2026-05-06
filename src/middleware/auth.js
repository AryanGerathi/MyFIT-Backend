const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── Protect routes — require valid JWT ───────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Allow synthetic admin token (no DB user required) ──────────────────
    if (decoded.role === "admin" && decoded.id === "admin") {
      req.user = { id: "admin", role: "admin" };
      return next();
    }

    // Always fetch fresh from DB — so role changes take effect immediately
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account deactivated.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError")
      return res.status(401).json({ success: false, message: "Invalid token." });
    if (error.name === "TokenExpiredError")
      return res.status(401).json({ success: false, message: "Token expired. Please login again." });
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Restrict to specific roles ────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Requires role: ${roles.join(" or ")}`,
    });
  }
  next();
};

module.exports = { protect, authorize };