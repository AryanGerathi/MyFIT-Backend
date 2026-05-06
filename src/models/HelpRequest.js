const mongoose = require("mongoose");

const helpRequestSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName:  { type: String, required: true },
    userEmail: { type: String, required: true },
    category:  { type: String, required: true },
    subject:   { type: String, required: true, maxlength: 100 },
    message:   { type: String, required: true },
    status:    {
      type:    String,
      enum:    ["open", "in-progress", "resolved"],
      default: "open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HelpRequest", helpRequestSchema);