const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const OTP  = require("../models/OTP");
const { sendOTPEmail } = require("../config/mailer");

const MAX_ATTEMPTS    = 5;
const RESEND_COOLDOWN = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateOTP = () => {
  const len = parseInt(process.env.OTP_LENGTH) || 6;
  return crypto.randomInt(10 ** (len - 1), 10 ** len).toString();
};

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  return res.status(statusCode).json({
    success: true,
    token,
    user: user.toSafeObject(),
  });
};

const getOTPExpiry = () =>
  new Date(Date.now() + (parseInt(process.env.OTP_EXPIRES_MINUTES) || 10) * 60 * 1000);

const maskedEmail = (email) => {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"*".repeat(local.length - 2)}@${domain}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/signup
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, email, phone, countryCode = "+91", password, role } = req.body;

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    if (await User.findOne({ "phone.number": phone, "phone.countryCode": countryCode })) {
      return res.status(409).json({
        success: false,
        message: "An account with this phone number already exists.",
      });
    }

    const user = await User.create({
      name,
      email,
      phone: { countryCode, number: phone },
      password,
      role: role === "creator" ? "creator" : "user",
      isVerified: false,
    });

    const otp = generateOTP();
    await OTP.deleteMany({ userId: user._id, purpose: "signup" });
    await OTP.create({
      userId:    user._id,
      email:     email.toLowerCase(),
      purpose:   "signup",
      otpHash:   otp,
      expiresAt: getOTPExpiry(),
    });
    await sendOTPEmail(email, otp, "signup");

    return res.status(201).json({
      success: true,
      message: `OTP sent to ${maskedEmail(email)}. Check your inbox.`,
      userId:  user._id,
    });
  } catch (error) {
    console.error("signup error:", error.message);
    if (error.code === 11000)
      return res.status(409).json({ success: false, message: "Account already exists." });
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account deactivated. Contact support." });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Account not verified. Please complete signup verification first.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    return sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error("login error:", error.message);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/verify-otp
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { userId, otp, purpose } = req.body;

    if (purpose !== "signup") {
      return res.status(400).json({
        success: false,
        message: "OTP verification is only used for signup.",
      });
    }

    const otpRecord = await OTP.findOne({ userId, purpose }).select("+otpHash");
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or already expired. Please request a new one.",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await otpRecord.deleteOne();
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await otpRecord.deleteOne();
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    const isMatch = await otpRecord.verifyOTP(otp);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = MAX_ATTEMPTS - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      });
    }

    await otpRecord.deleteOne();

    const user = await User.findByIdAndUpdate(userId, { isVerified: true }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error("verifyOTP error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/resend-otp
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { userId, purpose } = req.body;

    if (!userId || !purpose) {
      return res.status(400).json({ success: false, message: "userId and purpose are required." });
    }

    if (purpose !== "signup") {
      return res.status(400).json({ success: false, message: "OTP resend is only for signup." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Account is already verified." });
    }

    const existing = await OTP.findOne({ userId, purpose });
    if (existing) {
      const secondsAgo = (Date.now() - new Date(existing.createdAt).getTime()) / 1000;
      if (secondsAgo < RESEND_COOLDOWN) {
        const wait = Math.ceil(RESEND_COOLDOWN - secondsAgo);
        return res.status(429).json({
          success: false,
          message: `Please wait ${wait} second${wait === 1 ? "" : "s"} before requesting a new OTP.`,
        });
      }
    }

    await OTP.deleteMany({ userId, purpose });
    const otp = generateOTP();
    await OTP.create({
      userId,
      email:     user.email,
      purpose,
      otpHash:   otp,
      expiresAt: getOTPExpiry(),
    });
    await sendOTPEmail(user.email, otp, purpose);

    return res.status(200).json({
      success: true,
      message: `New OTP sent to ${maskedEmail(user.email)}. Check your inbox.`,
    });
  } catch (error) {
    console.error("resendOTP error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    console.error("getMe error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/auth/update-profile
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, phone, countryCode, specialization, bio } = req.body;

    const updateFields = {
      name,
      "phone.number":      phone,
      "phone.countryCode": countryCode || "+91",
    };

    if (req.user.role === "creator") {
      if (specialization !== undefined) updateFields["creatorProfile.specialization"] = specialization;
      if (bio !== undefined)            updateFields["creatorProfile.bio"] = bio;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    console.error("updateProfile error:", error.message);
    return res.status(500).json({ success: false, message: "Could not update profile." });
  }
};

module.exports = { signup, login, verifyOTP, resendOTP, getMe, updateProfile };