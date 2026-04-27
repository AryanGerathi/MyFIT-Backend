const { validationResult } = require("express-validator");
const User = require("../models/User");

const ALL_SLOTS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM",
  "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM",
  "2:00 PM",  "3:00 PM",  "4:00 PM",  "5:00 PM",
  "6:00 PM",  "7:00 PM",  "8:00 PM",
];

// ── GET /api/creator/pricing ──────────────────────────────────────────────────
exports.getPricing = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("creatorProfile.dailyPrice creatorProfile.monthlyPrice creatorProfile.monthlySessions")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const {
      dailyPrice      = 800,
      monthlyPrice    = 12000,
      monthlySessions = 20,
    } = user.creatorProfile || {};

    return res.json({
      success: true,
      pricing: { dailyPrice, monthlyPrice, monthlySessions },
    });
  } catch (err) {
    console.error("getPricing error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch pricing." });
  }
};

// ── PUT /api/creator/pricing ──────────────────────────────────────────────────
exports.savePricing = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const d = Number(req.body.dailyPrice);
    const m = Number(req.body.monthlyPrice);
    const s = Number(req.body.monthlySessions);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          "creatorProfile.dailyPrice":      d,
          "creatorProfile.monthlyPrice":    m,
          "creatorProfile.monthlySessions": s,
        },
      },
      { new: true, runValidators: true }
    ).select("creatorProfile.dailyPrice creatorProfile.monthlyPrice creatorProfile.monthlySessions");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({
      success: true,
      pricing: {
        dailyPrice:      user.creatorProfile.dailyPrice,
        monthlyPrice:    user.creatorProfile.monthlyPrice,
        monthlySessions: user.creatorProfile.monthlySessions,
      },
    });
  } catch (err) {
    console.error("savePricing error:", err);
    return res.status(500).json({ success: false, message: "Could not save pricing." });
  }
};

// ── GET /api/creator/slots ────────────────────────────────────────────────────
exports.getSlots = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("creatorProfile.timeSlots")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({
      success:   true,
      timeSlots: user.creatorProfile?.timeSlots ?? [],
    });
  } catch (err) {
    console.error("getSlots error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch time slots." });
  }
};

// ── PUT /api/creator/slots ────────────────────────────────────────────────────
exports.saveSlots = async (req, res) => {
  try {
    const incoming = req.body.timeSlots;

    if (!Array.isArray(incoming)) {
      return res.status(400).json({ success: false, message: "timeSlots must be an array." });
    }

    // Validate every slot against the allowed list
    const invalid = incoming.filter((s) => !ALL_SLOTS.includes(s));
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid slot(s): ${invalid.join(", ")}`,
      });
    }

    // Preserve original order from ALL_SLOTS
    const ordered = ALL_SLOTS.filter((s) => incoming.includes(s));

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { "creatorProfile.timeSlots": ordered } },
      { new: true, runValidators: true }
    ).select("creatorProfile.timeSlots");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({
      success:   true,
      timeSlots: user.creatorProfile.timeSlots,
    });
  } catch (err) {
    console.error("saveSlots error:", err);
    return res.status(500).json({ success: false, message: "Could not save time slots." });
  }
};

// ── GET /api/creator/public ───────────────────────────────────────────────────
// Returns all verified creators (public — no auth required)
exports.getVerifiedCreators = async (req, res) => {
  try {
    const creators = await User.find({
      role: "creator",
      "creatorProfile.verified": true,
    })
      .select("name email profileImage creatorProfile")
      .lean();

    return res.json({ success: true, creators });
  } catch (err) {
    console.error("getVerifiedCreators error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch creators." });
  }
};