const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  bookingId:   { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, unique: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  creatorId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  lastMessage: { type: String, default: "" },
  lastAt:      { type: Date,   default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);