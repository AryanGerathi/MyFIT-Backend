const express     = require("express");
const router      = express.Router();
const HelpRequest = require("../models/HelpRequest");
const { protect, authorize } = require("../middleware/auth");

// POST /api/help — logged-in user submits a request
router.post("/", protect, async (req, res) => {
  try {
    const { category, subject, message } = req.body;
    if (!category || !subject || !message)
      return res.status(400).json({ success: false, message: "All fields are required." });

    const userId = req.user._id || req.user.id;
    if (userId === "admin")
      return res.status(403).json({ success: false, message: "Admin cannot submit help requests." });

    const request = await HelpRequest.create({
      userId,
      userName:  req.user.name  || "User",
      userEmail: req.user.email || "",
      category,
      subject:   subject.trim(),
      message:   message.trim(),
    });

    res.status(201).json({ success: true, request });
  } catch (err) {
    console.error("POST /api/help:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/help/mine — user sees only their own requests
// ⚠️ Must be before /:id routes
router.get("/mine", protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    if (userId === "admin")
      return res.json({ success: true, requests: [] });

    const requests = await HelpRequest
      .find({ userId })
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    console.error("GET /api/help/mine:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/help — admin sees all requests
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const requests = await HelpRequest
      .find()
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    console.error("GET /api/help:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/help/:id/status — admin updates status
router.patch("/:id/status", protect, authorize("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "in-progress", "resolved"].includes(status))
      return res.status(400).json({ success: false, message: "Invalid status." });

    const request = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!request)
      return res.status(404).json({ success: false, message: "Request not found." });

    res.json({ success: true, request });
  } catch (err) {
    console.error("PATCH /api/help/:id/status:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;