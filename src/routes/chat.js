const express    = require("express");
const router     = express.Router();
const { protect } = require("../middleware/auth"); // ← destructure protect

const chatController = require("../controllers/chatController");

router.get("/my-conversations",          protect, chatController.getMyConversations);
router.get("/booking/:bookingId",        protect, chatController.getOrCreateConversation);
router.get("/:conversationId/messages",  protect, chatController.getMessages);
router.post("/:conversationId/send",     protect, chatController.sendMessage);

module.exports = router;