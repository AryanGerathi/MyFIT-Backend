const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");
const {
  submitReview,
  getCreatorReviews,
  getMyReviewForBooking,
} = require("../controllers/reviewController");

router.post("/",                        protect, submitReview);
router.get("/creator/:creatorId",                getCreatorReviews);      // public
router.get("/booking/:bookingId",       protect, getMyReviewForBooking);

module.exports = router;