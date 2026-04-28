const express  = require("express");
const router   = express.Router();
const { protect } = require("../middleware/auth");
const Payment  = require("../models/Payment");
const {
  getAllCreators,
  getVerifiedCreators,
  verifyCreator,
  getAllUsers,
} = require("../controllers/adminController");

// ── PUBLIC — no auth required ─────────────────────────────────────────────────
router.get("/creators/verified", getVerifiedCreators);

// ── PROTECTED — require valid JWT ─────────────────────────────────────────────
router.get("/creators",            protect, getAllCreators);
router.put("/creators/:id/verify", protect, verifyCreator);
router.get("/users",               protect, getAllUsers);

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
router.get("/payments", protect, async (req, res) => {
  try {
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .populate("userId",    "name email")
      .populate("creatorId", "name email");

    res.json({ success: true, payments });
  } catch (err) {
    console.error("Fetch payments error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
});

module.exports = router;