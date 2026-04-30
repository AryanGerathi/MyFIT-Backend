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
  getBankDetails,
  saveBankDetails,
} = require("../controllers/creatorController");

// ── Public ────────────────────────────────────────────────────────────────────
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
router.get("/slots", protect, authorize("creator"), getSlots);

router.put("/slots", protect, authorize("creator"), [
  body("timeSlots")
    .isArray().withMessage("timeSlots must be an array.")
    .custom(arr => arr.length <= 15).withMessage("Cannot have more than 15 slots."),
], saveSlots);

// ── Bank Details ──────────────────────────────────────────────────────────────
router.get("/bank-details", protect, authorize("creator"), getBankDetails);

router.put("/bank-details", protect, authorize("creator"), [
  body("accountHolderName")
    .notEmpty().withMessage("Account holder name is required."),
  body("accountNumber")
    .notEmpty().withMessage("Account number is required.")
    .isNumeric().withMessage("Account number must contain only digits."),
  body("ifscCode")
    .notEmpty().withMessage("IFSC code is required."),
  body("bankName")
    .notEmpty().withMessage("Bank name is required."),
  body("accountType")
    .isIn(["savings", "current"]).withMessage("Account type must be savings or current."),
  body("upiId")
    .optional({ checkFalsy: true })
    .matches(/^[\w.\-]+@[\w.\-]+$/).withMessage("Invalid UPI ID format."),
], saveBankDetails);

module.exports = router;