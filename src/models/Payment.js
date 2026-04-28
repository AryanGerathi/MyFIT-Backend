const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  razorpayOrderId:   { type: String, required: true },
  razorpayPaymentId: { type: String, required: true },

  jitsiRoomId: { type: String, default: null },   // generated after payment verified

  amount:      { type: Number, required: true },   // total in ₹
  commission:  { type: Number, required: true },   // 2% platform fee

  sessionType: { type: String, enum: ["single", "monthly"], required: true },
  date:        { type: String, default: null },    // null for monthly plans
  time:        { type: String, default: null },    // null for monthly plans

  status: {
    type:    String,
    enum:    ["upcoming", "completed", "pending", "failed"],
    default: "upcoming",
  },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);