import mongoose from "mongoose";

const notificationSchema = mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["REMINDER", "MISSED_LEAD", "REQUEST_ACCEPTED", "REQUEST_REJECTED", "SYSTEM"],
      default: "SYSTEM",
    },
    url: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.InAppNotification || mongoose.model("InAppNotification", notificationSchema);
