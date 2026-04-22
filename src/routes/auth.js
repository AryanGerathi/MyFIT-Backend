const express = require("express");
const { body } = require("express-validator");
const { signup, login, verifyOTP, resendOTP, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// ── Validation rules ──────────────────────────────────────────────────────────

const signupRules = [
  body("name")
    .trim().notEmpty().withMessage("Name is required")
    .isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email")
    .trim().isEmail().withMessage("Enter a valid email address"),
  body("phone")
    .trim().matches(/^\d{10}$/).withMessage("Phone must be exactly 10 digits"),
  body("countryCode")
    .optional().matches(/^\+\d{1,4}$/).withMessage("Invalid country code"),
  body("password")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role")
    .optional().isIn(["user", "creator"]).withMessage("Role must be 'user' or 'creator'"),
];

const loginRules = [
  body("email")
    .trim().isEmail().withMessage("Enter a valid email address"),
  body("password")
    .notEmpty().withMessage("Password is required"),
];

const verifyOTPRules = [
  body("userId")
    .notEmpty().withMessage("userId is required"),
  body("otp")
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits")
    .isNumeric().withMessage("OTP must contain only numbers"),
  body("purpose")
    .isIn(["signup", "login"]).withMessage("purpose must be 'signup' or 'login'"),
];

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/signup",     signupRules,    signup);
router.post("/login",      loginRules,     login);
router.post("/verify-otp", verifyOTPRules, verifyOTP);
router.post("/resend-otp",                 resendOTP);
router.get("/me",          protect,        getMe);

module.exports = router;