import cron from "node-cron";
import Employee from "../models/employee.model.js";
import Lead from "../models/lead.model.js";
import Followup from "../models/followup.model.js";
import EmployeeDailyReport from "../models/employeeDailyReport.model.js";
import mongoose from "mongoose";

// Runs every day at 23:55 (11:55 PM)
cron.schedule("55 23 * * *", async () => {
  console.log("[DailyReportCron] ⏳ Starting employee daily report snapshot...");
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // Fetch all active employees
    const employees = await Employee.find({ blocked: false });
    
    for (const emp of employees) {
      const employeeObjectId = emp._id;
      
      const totalLeads = await Lead.countDocuments({
        leadAssignedTo: employeeObjectId,
        deleted: false
      });

      const closedLeads = await Lead.countDocuments({
        leadAssignedTo: employeeObjectId,
        closed: true,
        negative: false,
        deleted: false
      });

      const negativeLeads = await Lead.countDocuments({
        leadAssignedTo: employeeObjectId,
        negative: true,
        closed: false,
        deleted: false
      });

      // Pending Leads
      const pendingLeadsResult = await Lead.aggregate([
        {
          $match: {
            leadAssignedTo: employeeObjectId,
            closed: false,
            deleted: false,
            negative: false,
          }
        },
        {
          $lookup: {
            from: "followups",
            let: { leadId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$leadId", "$$leadId"] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "latestFollowup",
          },
        },
        {
          $match: {
            $or: [
              { latestFollowup: { $eq: [] } },
              { "latestFollowup.0.followedBy": { $ne: employeeObjectId } },
            ],
          },
        },
        { $count: "total" }
      ]);
      const pendingLeads = pendingLeadsResult[0]?.total || 0;

      // Reminders for today
      const todayRemindersResult = await Followup.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$leadId", latestFollowup: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latestFollowup" } },
        { $match: { nextFollowupDate: { $gte: todayStart, $lte: todayEnd } } },
        { $lookup: { from: "leads", localField: "leadId", foreignField: "_id", as: "lead" } },
        { $unwind: "$lead" },
        {
          $match: {
            "lead.deleted": false,
            "lead.closed": false,
            "lead.negative": false,
            "lead.leadAssignedTo": employeeObjectId
          }
        }
      ]);
      const reminders = todayRemindersResult.length;

      // Missed Leads (Currently Missed as of 23:55)
      const missedLeadsResult = await Followup.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$leadId", latestFollowup: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$latestFollowup" } },
        { $match: { nextFollowupDate: { $gte: todayStart, $lt: new Date() } } },
        { $lookup: { from: "leads", localField: "leadId", foreignField: "_id", as: "lead" } },
        { $unwind: "$lead" },
        {
          $match: {
            "lead.deleted": false,
            "lead.closed": false,
            "lead.negative": false,
            "lead.leadAssignedTo": employeeObjectId
          }
        }
      ]);
      const missedLeads = missedLeadsResult.length;

      // Save to database
      await EmployeeDailyReport.findOneAndUpdate(
        { employeeId: employeeObjectId, date: todayStart },
        {
          employeeId: employeeObjectId,
          date: todayStart,
          assignedLeads: totalLeads,
          pendingLeads,
          reminders,
          negativeLeads,
          closedLeads,
          missedLeads
        },
        { upsert: true, new: true }
      );
    }

    console.log("[DailyReportCron] ✅ Employee daily reports saved successfully.");
  } catch (error) {
    console.error("[DailyReportCron] ❌ Error running daily report cron:", error);
  }
});
