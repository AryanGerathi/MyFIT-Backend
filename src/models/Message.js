const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  senderId:       { type: mongoose.Schema.Types.ObjectId, ref: "User",         required: true },
  text:           { type: String, default: "" },
  readAt:         { type: Date,   default: null },
  // TTL field — MongoDB auto-deletes 24hrs after session date
  deleteAt:       { type: Date,   required: true },
}, { timestamps: true });

// ── TTL Index — MongoDB deletes document when deleteAt is reached ──────────────
messageSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Message", messageSchema);