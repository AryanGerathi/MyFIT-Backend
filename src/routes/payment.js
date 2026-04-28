const express  = require("express");
const router   = express.Router();
const { protect } = require("../middleware/auth");
const { createOrder, verifyPayment } = require("../controllers/paymentController");
const Payment  = require("../models/Payment");

router.post("/create-order", protect, createOrder);
router.post("/verify",       protect, verifyPayment);

// ── User's own bookings ───────────────────────────────────────────────────────
router.get("/my-bookings", protect, async (req, res) => {
  try {
    const bookings = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("creatorId", "name email");

    res.json({ success: true, bookings });
  } catch (err) {
    console.error("Fetch my-bookings error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
});
router.get("/my-creator-bookings", protect, async (req, res) => {
    try {
      const bookings = await Payment.find({ creatorId: req.user._id })
        .sort({ createdAt: -1 })
        .populate("userId", "name email");
      res.json({ success: true, bookings });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to fetch creator bookings" });
    }
  });

module.exports = router;