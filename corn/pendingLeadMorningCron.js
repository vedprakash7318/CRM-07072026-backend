import cron from "node-cron";
import Employee from "../models/employee.model.js";
import admin from "../Firebase/firebaseAdmin.js";
import { getPendingLeadCount } from "../utils/pendingLeadCount.js";

// 🌅 Morning 10:10 AM
cron.schedule(
  "10 10 * * *",
  async () => {
    await sendPendingLeadNotifications("🌅 Good Morning!");
  },
  { timezone: "Asia/Kolkata" }
);

// 🌙 Night 8:34 PM
cron.schedule(
  "00 18 * * *",
  async () => {
    await sendPendingLeadNotifications("🌙 Evening Reminder");
  },
  { timezone: "Asia/Kolkata" }
);

// 🔁 Common function (reuse)
async function sendPendingLeadNotifications(title) {
  const employees = await Employee.find({
    blocked: false,
    fcmToken: { $ne: null }
  });

  for (const emp of employees) {
    const pendingCount = await getPendingLeadCount(emp._id);

    if (pendingCount > 0) {
      await admin.messaging().send({
        token: emp.fcmToken,
        notification: {
          title,
          body: `You have ${pendingCount} pending leads to follow up`
        },
        data: {
          url: "/pending",
          type: "PENDING_LEAD"
        },
        webpush: {
          notification: {
            title,
            body: `You have ${pendingCount} pending leads to follow up`,
            icon: "/favicon.ico",
            sound: "default",
            requireInteraction: true,
          },
          fcmOptions: {
            link: "/pending"
          }
        }
      });
    }
  }
}
