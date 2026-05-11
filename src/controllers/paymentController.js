const crypto   = require("crypto");
const razorpay = require("../config/razorpay");
const Payment  = require("../models/Payment");
const { generateRoomId, getMeetingUrl } = require("../config/jitsi");
const { sendBookingConfirmation }       = require("../config/whatsapp");

// ── Create Razorpay Order ─────────────────────────────────────────────────────

const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    const order = await razorpay.orders.create({
      amount:  amount * 100,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ success: false, message: "Order creation failed" });
  }
};

// ── Verify Payment & Confirm Booking ─────────────────────────────────────────

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

    // 1. Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // 2. Save booking to DB
    const booking = await Payment.create({
      userId:            req.user._id,
      creatorId,
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount,
      commission,
      sessionType,
      date:   date || null,
      time:   time || null,
      status: "upcoming",
    });

    // 3. Generate Jitsi room
    const jitsiRoomId   = generateRoomId(booking._id.toString());
    booking.jitsiRoomId = jitsiRoomId;
    await booking.save();

    // 4. Populate user + creator for response & WhatsApp
    await booking.populate([
      { path: "userId",    select: "name email phone profileImage" },
      { path: "creatorId", select: "name" },
    ]);

    // 5. Build Jitsi meeting URL
    const jitsiRoomUrl = getMeetingUrl({
      roomId:      jitsiRoomId,
      name:        booking.userId.name,
      email:       booking.userId.email,
      avatarUrl:   booking.userId.profileImage?.url || "",
      isModerator: false,
    });

    // 6. Send WhatsApp confirmation (non-fatal)
    const countryCode = (booking.userId?.phone?.countryCode || "+91").replace("+", "");
    const phoneNumber = booking.userId?.phone?.number || "";

    if (phoneNumber) {
      sendBookingConfirmation(countryCode + phoneNumber, {
        creatorName: booking.creatorId?.name ?? "Your creator",
        date:        booking.date
                       ? new Date(booking.date).toDateString()
                       : "Monthly plan",
        time:        booking.time ?? "—",
        sessionType: booking.sessionType,
        amount:      Number(booking.amount).toLocaleString("en-IN"),
      }).catch((err) => console.error("WhatsApp send failed:", err.message));
    }

    // 7. Respond to client
    res.json({
      success:      true,
      message:      "Payment verified",
      paymentId:    razorpay_payment_id,
      jitsiRoomUrl,
      booking,
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

// ── Get My Bookings ───────────────────────────────────────────────────────────

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Payment.find({ userId: req.user._id })
      .populate("creatorId", "name profileImage creatorProfile")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ success: false, message: "Could not fetch bookings" });
  }
};

module.exports = { createOrder, verifyPayment, getMyBookings };