const crypto   = require("crypto");
const razorpay = require("../config/razorpay");
const Payment  = require("../models/Payment");
const { generateRoomId, getRoomUrl } = require("../config/jitsi");

const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ success: false, message: "Order creation failed" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      creatorId,
      amount,
      commission,
      sessionType,
      date,
      time,
    } = req.body;

    // ── Verify Razorpay signature ─────────────────────────────────────────────
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // ── Create booking first to get the _id for the room ─────────────────────
    const booking = await Payment.create({
      userId:            req.user._id,
      creatorId,
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount,
      commission,
      sessionType,
      date:   date  || null,
      time:   time  || null,
      status: "upcoming",
    });

    // ── Generate unique Jitsi room tied to this booking ───────────────────────
    const jitsiRoomId  = generateRoomId(booking._id.toString());
    booking.jitsiRoomId = jitsiRoomId;
    await booking.save();

    res.json({
      success:      true,
      message:      "Payment verified",
      paymentId:    razorpay_payment_id,
      jitsiRoomUrl: getRoomUrl(jitsiRoomId),
      booking,
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

module.exports = { createOrder, verifyPayment };