const express = require("express");
const { upload }                              = require("../config/cloudinary");
const { uploadProfileImage, deleteProfileImage } = require("../controllers/uploadController");
const { protect }                             = require("../middleware/auth");

const router = express.Router();

// All upload routes require a valid JWT
router.use(protect);

// POST /api/upload/profile-image  — multipart/form-data, field name: "image"
router.post(
  "/profile-image",
  upload.single("image"),   // multer handles the file
  uploadProfileImage
);

// DELETE /api/upload/profile-image
router.delete("/profile-image", deleteProfileImage);

module.exports = router;