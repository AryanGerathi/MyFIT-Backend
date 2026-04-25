const { validationResult } = require("express-validator");
const User = require("../models/User");

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
  // express-validator errors (same pattern as authController)
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