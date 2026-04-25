const express  = require("express");
const router   = express.Router();
const { body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const { getPricing, savePricing } = require("../controllers/creatorController");

// ── GET /api/creator/pricing ──────────────────────────────────────────────────
router.get("/pricing", protect, authorize("creator"), getPricing);

// ── PUT /api/creator/pricing ──────────────────────────────────────────────────
router.put("/pricing", protect, authorize("creator"), [
  body("dailyPrice")
    .isNumeric().withMessage("Daily price must be a number.")
    .custom(v => Number(v) >= 100).withMessage("Daily price must be at least ₹100."),

  body("monthlyPrice")
    .isNumeric().withMessage("Monthly price must be a number.")
    .custom(v => Number(v) >= 1000).withMessage("Monthly price must be at least ₹1,000."),

  body("monthlySessions")
    .isInt({ min: 1 }).withMessage("Sessions per month must be a whole number ≥ 1."),
], savePricing);

module.exports = router;