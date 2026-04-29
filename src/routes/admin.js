const express    = require("express");
const router     = express.Router();
const { protect } = require("../middleware/auth");
const Payment    = require("../models/Payment");
const Withdrawal = require("../models/Withdrawal");
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

// ── WITHDRAWALS ───────────────────────────────────────────────────────────────
router.get("/withdrawals", protect, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .sort({ createdAt: -1 })
      .populate("creatorId", "name email");

    res.json({ success: true, withdrawals });
  } catch (err) {
    console.error("Fetch withdrawals error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch withdrawals" });
  }
});

router.patch("/withdrawals/:id", protect, async (req, res) => {
  try {
    const { action } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action. Use 'approve' or 'reject'." });
    }

    const withdrawal = await Withdrawal.findByIdAndUpdate(
      req.params.id,
      { status: action === "approve" ? "approved" : "rejected" },
      { new: true }
    ).populate("creatorId", "name email");

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found." });
    }

    res.json({ success: true, message: `Withdrawal ${action}d successfully.`, withdrawal });
  } catch (err) {
    console.error("Update withdrawal error:", err);
    res.status(500).json({ success: false, message: "Failed to update withdrawal." });
  }
});

module.exports = router;