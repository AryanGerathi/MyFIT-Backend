const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  creatorId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  razorpayOrderId:   { type: String, required: true },
  razorpayPaymentId: { type: String, required: true },
  amount:          { type: Number, required: true },   // total in ₹
  commission:      { type: Number, required: true },   // 2% platform fee
  sessionType:     { type: String, enum: ["single", "monthly"] },
  date:            { type: String },
  time:            { type: String },
  status:          { type: String, enum: ["success", "pending", "failed"], default: "success" },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);