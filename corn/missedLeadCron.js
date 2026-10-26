import cron from "node-cron";
import Followup from "../models/followup.model.js";
import Employee from "../models/employee.model.js";
import Notification from "../models/notification.model.js";
import admin from "../Firebase/firebaseAdmin.js";


// Run at 10 AM and 4 PM (10:00, 16:00)
cron.schedule(
  "0 10,16 * * *",
  async () => {
    try {
      const now = new Date();
      console.log(`[MissedLeadCron] Running at: ${now.toISOString()} (IST: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const employees = await Employee.find({ blocked: false, fcmTokens: { $exists: true, $not: { $size: 0 } } });

      for (const emp of employees) {
        const employeeId = emp._id;
        const missedLeadsResult = await Followup.aggregate([
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: "$leadId",
              latestFollowup: { $first: "$$ROOT" }
            }
          },
          { $replaceRoot: { newRoot: "$latestFollowup" } },
          {
            $match: {
              nextFollowupDate: { $lt: todayStart, $ne: null },
              followedBy: employeeId
            }
          },
          {
            $lookup: {
              from: "leads",
              localField: "leadId",
              foreignField: "_id",
              as: "lead"
            }
          },
          { $unwind: "$lead" },
          {
            $match: {
              "lead.deleted": false,
              "lead.closed": false,
              "lead.negative": false,
              "lead.publicLead": { $ne: true },
              "lead.leadAssignedTo": employeeId
            }
          }
        ]);

        let missedLeadsCount = missedLeadsResult.length;
        let newMissedCount = 0;
        const missedFollowupIds = [];

        for (const leadResult of missedLeadsResult) {
          if (!leadResult.missedCounted) {
            newMissedCount++;
            missedFollowupIds.push(leadResult._id);
          }
        }

        if (newMissedCount > 0) {
          await Followup.updateMany({ _id: { $in: missedFollowupIds } }, { $set: { missedCounted: true } });
        }

        if (missedLeadsCount > 0) {
          try {
            await admin.messaging().sendEachForMulticast({
              tokens: emp.fcmTokens,
              notification: {
                title: "🚨 Missed Leads Alert",
                body: `You have ${missedLeadsCount} missed lead(s). Please follow up ASAP.`
              },
              data: {
                url: "/missedLeads",
                type: "MISSED_LEAD"
              },
              webpush: {
                notification: {
                  title: "🚨 Missed Leads Alert",
                  body: `You have ${missedLeadsCount} missed lead(s). Please follow up ASAP.`,
                  icon: "/favicon.ico",
                  sound: "default",
                  requireInteraction: true,
                },
                fcmOptions: {
                  link: "/missedLeads"
                }
              }
            });
            console.log(`[MissedLeadCron] ✅ Sent to ${emp.empName}: ${missedLeadsCount} missed leads`);
          } catch (sendError) {
            console.error(`[MissedLeadCron] ❌ FCM error for ${emp.empName}:`, sendError.message);
          }

          // Save notification to DB
          try {
            await Notification.create({
              employeeId: emp._id,
              title: "🚨 Missed Leads Alert",
              body: `You have ${missedLeadsCount} missed lead(s). Please follow up ASAP.`,
              type: "MISSED_LEAD",
              url: "/missedLeads"
            });
          } catch (dbErr) {
            console.error(`[MissedLeadCron] ❌ DB save error for ${emp.empName}:`, dbErr.message);
          }
        }
      }
    } catch (error) {
      console.error("[MissedLeadCron] Error:", error);
    }
  },
  { timezone: "Asia/Kolkata" }
);

console.log("[MissedLeadCron] Scheduled — runs at 10AM and 4PM (IST timezone)");
