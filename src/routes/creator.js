const express  = require("express");
const router   = express.Router();
const { body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const {
  getPricing,
  savePricing,
  getSlots,
  saveSlots,
  getVerifiedCreators,
} = require("../controllers/creatorController");

// ── Public ────────────────────────────────────────────────────────────────────
// GET /api/creator/public — all verified creators (used by Explore & CreatorProfile)
router.get("/public", getVerifiedCreators);

// ── Pricing ───────────────────────────────────────────────────────────────────
router.get("/pricing", protect, authorize("creator"), getPricing);

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

// ── Time Slots ────────────────────────────────────────────────────────────────
// GET /api/creator/slots — fetch creator's saved slots
router.get("/slots", protect, authorize("creator"), getSlots);

// PUT /api/creator/slots — save creator's selected slots
router.put("/slots", protect, authorize("creator"), [
  body("timeSlots")
    .isArray().withMessage("timeSlots must be an array.")
    .custom(arr => arr.length <= 15).withMessage("Cannot have more than 15 slots."),
], saveSlots);

module.exports = router;