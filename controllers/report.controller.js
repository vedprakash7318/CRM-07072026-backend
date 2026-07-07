import EmployeeDailyReport from "../models/employeeDailyReport.model.js";
import Lead from "../models/lead.model.js";
import Followup from "../models/followup.model.js";
import mongoose from "mongoose";

export const getEmployeeDailyReport = async (req, res) => {
  try {
    const employeeId = req.params.empId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const totalLeads = await Lead.countDocuments({ leadAssignedTo: employeeObjectId, deleted: false });
    const closedLeads = await Lead.countDocuments({ leadAssignedTo: employeeObjectId, closed: true, negative: false, deleted: false });
    const negativeLeads = await Lead.countDocuments({ leadAssignedTo: employeeObjectId, negative: true, closed: false, deleted: false });

    const pendingLeadsResult = await Lead.aggregate([
      { $match: { leadAssignedTo: employeeObjectId, closed: false, deleted: false, negative: false } },
      { $lookup: { from: "followups", let: { leadId: "$_id" }, pipeline: [ { $match: { $expr: { $eq: ["$leadId", "$$leadId"] } } }, { $sort: { createdAt: -1 } }, { $limit: 1 } ], as: "latestFollowup" } },
      { $match: { $or: [ { latestFollowup: { $eq: [] } }, { "latestFollowup.0.followedBy": { $ne: employeeObjectId } } ] } },
      { $count: "total" }
    ]);
    const pendingLeads = pendingLeadsResult[0]?.total || 0;

    const todayRemindersResult = await Followup.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$leadId", latestFollowup: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latestFollowup" } },
      { $match: { nextFollowupDate: { $gte: todayStart, $lte: todayEnd } } },
      { $lookup: { from: "leads", localField: "leadId", foreignField: "_id", as: "lead" } },
      { $unwind: "$lead" },
      { $match: { "lead.deleted": false, "lead.closed": false, "lead.negative": false, "lead.leadAssignedTo": employeeObjectId } }
    ]);
    const reminders = todayRemindersResult.length;

    const missedLeadsResult = await Followup.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$leadId", latestFollowup: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latestFollowup" } },
      { $match: { nextFollowupDate: { $gte: todayStart, $lt: new Date() } } },
      { $lookup: { from: "leads", localField: "leadId", foreignField: "_id", as: "lead" } },
      { $unwind: "$lead" },
      { $match: { "lead.deleted": false, "lead.closed": false, "lead.negative": false, "lead.leadAssignedTo": employeeObjectId } }
    ]);
    const missedLeads = missedLeadsResult.length;

    await EmployeeDailyReport.findOneAndUpdate(
      { employeeId: employeeObjectId, date: todayStart },
      { employeeId: employeeObjectId, date: todayStart, assignedLeads: totalLeads, pendingLeads, reminders, negativeLeads, closedLeads, missedLeads },
      { upsert: true, new: true }
    );

    const reports = await EmployeeDailyReport.find({ employeeId })
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      message: "Daily reports fetched successfully",
      data: reports
    });
  } catch (error) {
    console.error("Report Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message
    });
  }
};
