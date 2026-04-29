const express  = require("express");
const router   = express.Router();
const { protect }                    = require("../middleware/auth");
const { createOrder, verifyPayment } = require("../controllers/paymentController");
const Payment  = require("../models/Payment");
const { generateRoomId, getMeetingUrl } = require("../config/jitsi");

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

// ── Creator's bookings ────────────────────────────────────────────────────────
router.get("/my-creator-bookings", protect, async (req, res) => {
  try {
    const bookings = await Payment.find({ creatorId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    res.json({ success: true, bookings });
  } catch (err) {
    console.error("Fetch creator-bookings error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch creator bookings" });
  }
});

// ── Get Jitsi room — JWT generated per role (moderator vs participant) ─────────
router.get("/booking/:bookingId/room", protect, async (req, res) => {
  try {
    const booking = await Payment.findById(req.params.bookingId)
      .populate("creatorId", "name email profileImage")
      .populate("userId",    "name email profileImage");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const requesterId = req.user._id.toString();
    const isCreator   = booking.creatorId._id.toString() === requesterId;
    const isUser      = booking.userId._id.toString()    === requesterId;

    if (!isCreator && !isUser) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Auto-generate room if missing (old bookings before Jitsi was added)
    if (!booking.jitsiRoomId) {
      booking.jitsiRoomId = generateRoomId(booking._id.toString());
      await booking.save();
    }

    const roomId      = booking.jitsiRoomId;
    const participant = isCreator ? booking.creatorId : booking.userId;

    // Creator gets moderator JWT → starts call immediately, no waiting screen
    // User gets participant JWT  → joins directly, no login required
    const roomUrl = getMeetingUrl({
      roomId,
      name:        participant.name,
      email:       participant.email,
      avatarUrl:   participant.profileImage?.url || "",
      isModerator: isCreator,
    });

    res.json({ success: true, roomId, roomUrl });
  } catch (err) {
    console.error("Fetch room error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch room link" });
  }
});

module.exports = router;