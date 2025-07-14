const mongoose = require("mongoose");

const leaveHistorySchema = new mongoose.Schema(
  {
    leave: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leave",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: ["CREATED", "APPROVED", "REJECTED", "UPDATED", "DELETED"],
      required: true,
    },

    message: { type: String },

    statusChange: {
      type: String,
      enum: ["pending", "approved", "rejected"],
    },

    change: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveHistory", leaveHistorySchema);
