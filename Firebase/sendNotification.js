import admin from "./firebaseAdmin.js";
import Employee from "../models/employee.model.js";
import InAppNotification from "../models/notification.model.js";

export const sendNotification = async (req, res) => {
  try {
    const { employeeId, title, message } = req.body;
    console.log("📧 Notification request:", { employeeId, title, message });

    // Validate input
    if (!employeeId || !title || !message) {
      return res.status(400).json({ 
        success: false,
        message: "employeeId, title, and message are required" 
      });
    }

    // Find employee
    const employee = await Employee.findById(employeeId);
    console.log("👤 Employee lookup:", { 
      found: !!employee, 
      name: employee?.empName,
      hasFCMToken: !!(employee?.fcmTokens && employee.fcmTokens.length > 0) 
    });
    
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: "Employee not found" 
      });
    }
    
    if ((!employee.fcmTokens || employee.fcmTokens.length === 0)) {
      console.log("❌ FCM token missing for employee:", employee.empName);
      return res.status(400).json({ 
        success: false,
        message: `Employee "${employee.empName}" has not enabled notifications. They need to login first.` 
      });
    }

    // Save notification to database
    await InAppNotification.create({ 
      title, 
      body: message, 
      employeeId,
      type: 'SYSTEM'
    });
    console.log("💾 Notification saved to database");

    // Send via Firebase
    try {
      const result = await admin.messaging().sendEachForMulticast({ tokens: employee.fcmTokens,
        notification: {
          title,
          body: message,
        },
        webpush: {
          notification: {
            title,
            body: message,
            icon: "/favicon.ico",
            sound: "default",
            requireInteraction: true,
          },
        },
      });
      
      console.log("✅ Notification sent successfully:", result);
      res.json({ 
        success: true, 
        messageId: result,
        employee: employee.empName
      });
      
    } catch (firebaseErr) {
      console.error("❌ Firebase send error:", firebaseErr.message);
      
      if (firebaseErr.code === "messaging/invalid-registration-token") {
        // Token is invalid, clear it
        await Employee.findByIdAndUpdate(employeeId, { fcmTokens: [] });
        return res.status(400).json({ 
          success: false,
          message: "Invalid notification token. Employee needs to login again." 
        });
      }
      
      throw firebaseErr;
    }
    
  } catch (err) {
    console.error("❌ Notification send error:", err.message);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
