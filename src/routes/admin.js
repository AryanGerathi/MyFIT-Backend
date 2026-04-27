const express  = require("express");
const router   = express.Router();
const { protect } = require("../middleware/auth");
const {
  getAllCreators,
  getVerifiedCreators,
  verifyCreator,
  getAllUsers,
} = require("../controllers/adminController");

// ── PUBLIC — no auth required ─────────────────────────────────────────────────
// Must be declared BEFORE /creators/:id to avoid "verified" matching as an id
router.get("/creators/verified", getVerifiedCreators);

// ── PROTECTED — require valid JWT ─────────────────────────────────────────────
router.get("/creators",           protect, getAllCreators);
router.put("/creators/:id/verify", protect, verifyCreator);
router.get("/users",              protect, getAllUsers);

module.exports = router;