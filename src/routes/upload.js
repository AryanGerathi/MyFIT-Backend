const express = require("express");
const { upload } = require("../config/cloudinary");
const { uploadProfileImage, deleteProfileImage, uploadChatImage } = require("../controllers/uploadController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.post("/profile-image", upload.single("image"), uploadProfileImage);
router.delete("/profile-image", deleteProfileImage);

// ── New: chat image upload ─────────────────────────────────────────────────
router.post("/chat-image", upload.single("image"), uploadChatImage);

module.exports = router;