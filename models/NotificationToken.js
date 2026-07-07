import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  title: String,
  message: String,

  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },

  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);

