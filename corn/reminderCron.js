import cron from "node-cron";
import Followup from "../models/followup.model.js";
import Employee from "../models/employee.model.js";
import Notification from "../models/notification.model.js";
import admin from "../Firebase/firebaseAdmin.js";

// Run every 2 hours between 10 AM and 6 PM (10:00, 12:00, 14:00, 16:00, 18:00)
cron.schedule(
  "0 10,12,14,16,18 * * *",
  async () => {
    try {
      const now = new Date();
      console.log(`[ReminderCron] Running at: ${now.toISOString()} (IST: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Get all active employees with FCM token
      const employees = await Employee.find({ blocked: false, fcmTokens: { $exists: true, $not: { $size: 0 } } });

      for (const emp of employees) {
        // Find followups due today that haven't been completed
        // (A followup is pending if it exists and the lead is not closed/deleted)
        const dueFollowupsCountResult = await import("../models/lead.model.js").then(module => module.default.aggregate([
          { $match: { leadAssignedTo: emp._id, closed: false, deleted: false, negative: false } },
          {
            $lookup: {
              from: "followups",
              let: { leadId: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$leadId", "$$leadId"] } } },
                { $sort: { createdAt: -1 } },
                { $limit: 1 }
              ],
              as: "latestFollowup"
            }
          },
          {
            $match: {
              "latestFollowup.0.nextFollowupDate": {
                $gte: startOfDay,
                $lte: endOfDay
              }
            }
          },
          { $count: "count" }
        ]));

        const dueFollowups = dueFollowupsCountResult.length > 0 ? dueFollowupsCountResult[0].count : 0;

        if (dueFollowups > 0) {
          try {
            await admin.messaging().sendEachForMulticast({
              tokens: emp.fcmTokens,
              notification: {
                title: "Reminder: Follow-ups Due",
                body: `You have ${dueFollowups} reminder(s) due today. Click to view them.`
              },
              data: {
                url: "/todayReminders",
                type: "REMINDER"
              },
              webpush: {
                notification: {
                  title: "Reminder: Follow-ups Due",
                  body: `You have ${dueFollowups} reminder(s) due today. Click to view them.`,
                  icon: "/favicon.ico",
                  sound: "default",
                  requireInteraction: true,
                },
                fcmOptions: {
                  link: "/todayReminders"
                }
              }
            });
            console.log(`[ReminderCron] ✅ Sent to ${emp.empName}: ${dueFollowups} reminders`);
          } catch (sendError) {
            console.error(`[ReminderCron] ❌ FCM error for ${emp.empName}:`, sendError.message);
          }

          // Save notification to DB
          try {
            await Notification.create({
              employeeId: emp._id,
              title: "📌 Reminder: Follow-ups Due",
              body: `You have ${dueFollowups} reminder(s) due today. Click to view them.`,
              type: "REMINDER",
              url: "/todayReminders"
            });
          } catch (dbErr) {
            console.error(`[ReminderCron] ❌ DB save error for ${emp.empName}:`, dbErr.message);
          }
        }
      }
    } catch (error) {
      console.error("[ReminderCron] Error:", error);
    }
  },
  { timezone: "Asia/Kolkata" }
);

console.log("[ReminderCron] Scheduled — runs every 2 hours between 10AM-6PM (IST timezone)");
