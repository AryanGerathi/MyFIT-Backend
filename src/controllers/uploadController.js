const User = require("../models/User");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/upload/profile-image
// @desc    Upload or replace creator profile image → Cloudinary
// @access  Private (JWT required)
// ─────────────────────────────────────────────────────────────────────────────
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }

    const user = await User.findById(req.user._id);

    // Delete old image from Cloudinary if it exists
    if (user.profileImage?.publicId) {
      await deleteFromCloudinary(user.profileImage.publicId);
    }

    // Upload new image
    const folder   = `myfit/profiles/${user.role}s`;
    const publicId = `user_${user._id}`;
    const result   = await uploadToCloudinary(req.file.buffer, folder, publicId);

    // Save URL + publicId to user document
    user.profileImage = {
      url:      result.secure_url,
      publicId: result.public_id,
    };
    await user.save();

    return res.status(200).json({
      success:  true,
      message:  "Profile image uploaded successfully.",
      imageUrl: result.secure_url,
      user:     user.toSafeObject(),
    });
  } catch (error) {
    console.error("uploadProfileImage error:", error.message);
    return res.status(500).json({ success: false, message: "Image upload failed. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/upload/profile-image
// @desc    Remove profile image
// @access  Private (JWT required)
// ─────────────────────────────────────────────────────────────────────────────
const deleteProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.profileImage?.publicId) {
      return res.status(400).json({ success: false, message: "No profile image to delete." });
    }

    await deleteFromCloudinary(user.profileImage.publicId);

    user.profileImage = { url: "", publicId: "" };
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile image removed.",
      user:    user.toSafeObject(),
    });
  } catch (error) {
    console.error("deleteProfileImage error:", error.message);
    return res.status(500).json({ success: false, message: "Could not delete image." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/upload/chat-image
// @desc    Upload a chat image → Cloudinary (separate folder, not tied to user)
// @access  Private (JWT required)
// ─────────────────────────────────────────────────────────────────────────────
const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }

    // Use a timestamped publicId so each chat image is unique
    const folder   = "myfit/chat-images";
    const publicId = `chat_${req.user._id}_${Date.now()}`;
    const result   = await uploadToCloudinary(req.file.buffer, folder, publicId);

    return res.status(200).json({
      success:  true,
      imageUrl: result.secure_url,
    });
  } catch (error) {
    console.error("uploadChatImage error:", error.message);
    return res.status(500).json({ success: false, message: "Image upload failed. Please try again." });
  }
};

module.exports = { uploadProfileImage, deleteProfileImage, uploadChatImage };