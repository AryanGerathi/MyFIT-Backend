const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ["signup", "login", "forgot-password"], // ✅ added forgot-password
    required: true,
  },
  // Always stored as bcrypt hash — never plain text
  otpHash: {
    type: String,
    required: true,
    select: false,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // MongoDB TTL index — auto-deletes document when expiresAt is reached
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
});

// Hash OTP before saving
otpSchema.pre("save", async function (next) {
  if (!this.isModified("otpHash")) return next();
  const salt = await bcrypt.genSalt(10);
  this.otpHash = await bcrypt.hash(this.otpHash, salt);
  next();
});

// Verify a plain OTP against stored hash
otpSchema.methods.verifyOTP = async function (plainOTP) {
  return bcrypt.compare(String(plainOTP), this.otpHash);
};

module.exports = mongoose.model("OTP", otpSchema);