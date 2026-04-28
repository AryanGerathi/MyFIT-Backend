const crypto = require("crypto");
const razorpay = require("../config/razorpay");

// Step 1: Create an order
const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ success: false, message: "Order creation failed" });
  }
};

// Step 2: Verify payment signature
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    res.json({ success: true, message: "Payment verified", paymentId: razorpay_payment_id });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

module.exports = { createOrder, verifyPayment }; // ✅ must be here