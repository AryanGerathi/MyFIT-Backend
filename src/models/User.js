const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email"],
    },
    phone: {
      countryCode: { type: String, required: true, default: "+91" },
      number:      { type: String, required: true, match: [/^\d{10}$/, "Phone must be 10 digits"] },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "creator"],
      default: "user",
    },
    isVerified: { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true  },

    // ── Profile image stored in Cloudinary ────────────────────────────────────
    profileImage: {
      url:      { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    creatorProfile: {
      bio:            { type: String, default: "" },
      specialization: { type: String, default: "" },
      verified:       { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare plain password with hash
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Return user without sensitive fields
userSchema.methods.toSafeObject = function () {
  return {
    _id:            this._id,
    name:           this.name,
    email:          this.email,
    phone:          this.phone,
    role:           this.role,
    isVerified:     this.isVerified,
    profileImage:   this.profileImage,
    creatorProfile: this.creatorProfile,
    createdAt:      this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);