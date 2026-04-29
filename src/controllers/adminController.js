const User = require("../models/User");

// ── GET /api/admin/creators ───────────────────────────────────────────────────
exports.getAllCreators = async (req, res) => {
  try {
    const creators = await User.find({ role: "creator" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, creators });
  } catch (err) {
    console.error("getAllCreators error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch creators." });
  }
};

// ── GET /api/admin/creators/verified — PUBLIC ─────────────────────────────────
exports.getVerifiedCreators = async (req, res) => {
  try {
    const creators = await User.find({
      role: "creator",
      "creatorProfile.verified": true,
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, creators });
  } catch (err) {
    console.error("getVerifiedCreators error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch creators." });
  }
};

// ── PUT /api/admin/creators/:id/verify ───────────────────────────────────────
exports.verifyCreator = async (req, res) => {
  try {
    const { verified } = req.body;

    if (typeof verified !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "verified field must be true or false.",
      });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: "creator" },
      { $set: { "creatorProfile.verified": verified } },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "Creator not found." });
    }

    return res.json({
      success: true,
      message: verified ? "Creator verified successfully." : "Creator verification removed.",
      user,
    });
  } catch (err) {
    console.error("verifyCreator error:", err);
    return res.status(500).json({ success: false, message: "Could not update verification." });
  }
};

// ── GET /api/admin/users ──────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, users });
  } catch (err) {
    console.error("getAllUsers error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch users." });
  }
};