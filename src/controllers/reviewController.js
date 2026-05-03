const Review  = require("../models/Review");
const Payment = require("../models/Payment");
const User    = require("../models/User");

// POST /api/reviews — Submit a review
const submitReview = async (req, res) => {
  try {
    const { bookingId, creatorId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!bookingId || !creatorId || !rating || !comment) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    // Verify the booking belongs to this user
    const booking = await Payment.findOne({ _id: bookingId, userId });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // Prevent duplicate reviews
    const existing = await Review.findOne({ bookingId });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already reviewed this booking." });
    }

    const review = await Review.create({ userId, creatorId, bookingId, rating, comment });

    // Update creator's average rating
    const allReviews = await Review.find({ creatorId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await User.findByIdAndUpdate(creatorId, {
      "creatorProfile.rating":  Math.round(avg * 10) / 10,
      "creatorProfile.reviews": allReviews.length,
    });

    return res.status(201).json({ success: true, message: "Review submitted!", review });
  } catch (err) {
    console.error("submitReview error:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// GET /api/reviews/creator/:creatorId — Get all reviews for a creator
const getCreatorReviews = async (req, res) => {
  try {
    const { creatorId } = req.params;

    const reviews = await Review.find({ creatorId })
      .populate("userId", "name profileImage")
      .sort({ createdAt: -1 });

    const averageRating = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    return res.json({ success: true, reviews, averageRating, totalReviews: reviews.length });
  } catch (err) {
    console.error("getCreatorReviews error:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// GET /api/reviews/booking/:bookingId — Check if user already reviewed
const getMyReviewForBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const review = await Review.findOne({ bookingId, userId });
    return res.json({ success: true, review: review || null });
  } catch (err) {
    console.error("getMyReviewForBooking error:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

module.exports = { submitReview, getCreatorReviews, getMyReviewForBooking };