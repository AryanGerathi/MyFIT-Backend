const Conversation = require("../models/Conversation");
const Message      = require("../models/Message");
const Payment      = require("../models/Payment");

// ── Helper: calculate deleteAt (24hrs after session date) ─────────────────────
const getDeleteAt = (booking) => {
  // booking.date is the session date string e.g. "2024-12-25"
  const sessionDate = booking.date ? new Date(booking.date) : new Date();
  const deleteAt = new Date(sessionDate);
  deleteAt.setHours(deleteAt.getHours() + 24);
  return deleteAt;
};

// ── GET /api/chat/booking/:bookingId ─────────────────────────────────────────
const getOrCreateConversation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Payment.findById(bookingId);
    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    const isParticipant =
      booking.userId.toString()    === userId.toString() ||
      booking.creatorId.toString() === userId.toString();

    if (!isParticipant)
      return res.status(403).json({ success: false, message: "Not your booking" });

    let convo = await Conversation.findOne({ bookingId });
    if (!convo) {
      convo = await Conversation.create({
        bookingId,
        userId:    booking.userId,
        creatorId: booking.creatorId,
      });
    }

    res.json({ success: true, conversation: convo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/chat/:conversationId/messages ────────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const convo = await Conversation.findById(conversationId);
    if (!convo)
      return res.status(404).json({ success: false, message: "Conversation not found" });

    const isParticipant =
      convo.userId.toString()    === userId.toString() ||
      convo.creatorId.toString() === userId.toString();

    if (!isParticipant)
      return res.status(403).json({ success: false, message: "Access denied" });

    // Mark messages sent by other person as read
    await Message.updateMany(
      { conversationId, senderId: { $ne: userId }, readAt: null },
      { readAt: new Date() }
    );

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/chat/:conversationId/send ───────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text }           = req.body;
    const userId             = req.user._id;

    if (!text?.trim())
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const convo = await Conversation.findById(conversationId).populate("bookingId");
    if (!convo)
      return res.status(404).json({ success: false, message: "Conversation not found" });

    const isParticipant =
      convo.userId.toString()    === userId.toString() ||
      convo.creatorId.toString() === userId.toString();

    if (!isParticipant)
      return res.status(403).json({ success: false, message: "Access denied" });

    const deleteAt = getDeleteAt(convo.bookingId);

    const message = await Message.create({
      conversationId,
      senderId: userId,
      text:     text.trim(),
      deleteAt,
    });

    // Update conversation preview
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text.trim().slice(0, 60),
      lastAt:      new Date(),
    });

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/chat/my-conversations ───────────────────────────────────────────
const getMyConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const convos = await Conversation.find({
      $or: [{ userId }, { creatorId: userId }],
    })
      .populate("userId",    "name profileImage")
      .populate("creatorId", "name profileImage")
      .populate("bookingId", "date sessionType status")
      .sort({ lastAt: -1 });

    res.json({ success: true, conversations: convos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getOrCreateConversation, getMessages, sendMessage, getMyConversations };