import express from "express";
import Notification from "../models/notification.model.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Get unread notifications for an employee
router.get("/:employeeId", verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const notifications = await Notification.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ employeeId, isRead: false });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark a single notification as read
router.put("/:notificationId/read", verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    res.status(200).json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all notifications as read for an employee
router.put("/:employeeId/read-all", verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    await Notification.updateMany({ employeeId, isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
