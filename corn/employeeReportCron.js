import cron from "node-cron";
import Employee from "../models/employee.model.js";
import Lead from "../models/lead.model.js";
import Followup from "../models/followup.model.js";
import EmployeeReportNew from "../models/employeeReportNew.model.js";

// Run at 6:59 PM every day
cron.schedule("59 18 * * *", async () => {
  console.log(`[EmployeeReportCron] Running daily snapshot at ${new Date().toISOString()}`);
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const employees = await Employee.find({ blocked: false });

    for (const emp of employees) {
      const empId = emp._id;
      const adminId = emp.addedBy;

      // 1. Followups taken today
      const followupsCount = await Followup.countDocuments({
        followedBy: empId,
        createdAt: { $gte: todayStart, $lte: todayEnd }
      });

      // 2. Reminders scheduled for today
      // Find the latest followup for leads assigned to this employee where nextFollowupDate is today
      // Wait, we can just count followups that have a nextFollowupDate of today.
      const remindersCount = await Followup.aggregate([
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
            nextFollowupDate: { $gte: todayStart, $lte: todayEnd },
            followedBy: empId
          }
        },
        { $count: "count" }
      ]);
      const reminders = remindersCount.length > 0 ? remindersCount[0].count : 0;

      // 3. Closed Leads today
      const closedCount = await Lead.countDocuments({
        leadAssignedTo: empId,
        closed: true,
        closedAt: { $gte: todayStart, $lte: todayEnd }
      });

      // 4. Negative Leads today
      const negativeCount = await Lead.countDocuments({
        leadAssignedTo: empId,
        negative: true,
        negativeAt: { $gte: todayStart, $lte: todayEnd }
      });

      // 5. Missed Leads (Current Snapshot)
      // Any lead assigned to emp, where latest followup has nextFollowupDate < todayStart
      const missedCountResult = await Followup.aggregate([
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
            followedBy: empId
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
            "lead.leadAssignedTo": empId
          }
        },
        { $count: "count" }
      ]);
      const missedLeads = missedCountResult.length > 0 ? missedCountResult[0].count : 0;

      // Save to database
      await EmployeeReportNew.findOneAndUpdate(
        { employeeId: empId, reportDate: todayStart },
        {
          $set: {
            adminId,
            missedLeads,
            reminders,
            followups: followupsCount,
            negativeLeads: negativeCount,
            closedLeads: closedCount
          }
        },
        { upsert: true, new: true }
      );
    }

    console.log(`[EmployeeReportCron] Successfully saved snapshot for ${employees.length} employees.`);
  } catch (error) {
    console.error("[EmployeeReportCron] Error saving daily snapshot:", error);
  }
}, { timezone: "Asia/Kolkata" });

console.log("[EmployeeReportCron] Scheduled — runs at 6:59 PM (IST) daily.");
