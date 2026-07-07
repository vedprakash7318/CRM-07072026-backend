import Lead from "../models/lead.model.js";
import Employee from "../models/employee.model.js";
import Tag from "../models/tag.modal.js";
import Priority from "../models/priority.model.js";
import LeadSources from "../models/leadSources.model.js";
import Followup from "../models/followup.model.js";
import mongoose from "mongoose";
import moment from "moment";

export const getDashboardStats = async (req, res) => {
  try {
    const addedBy = req.query.addedBy || req.body.addedBy;

    if (!addedBy) {
      return res.status(400).json({
        success: false,
        message: "addedBy is required",
      });
    }

    const totalLeads = await Lead.countDocuments({
      deleted: false,
      closed: false,
      negative: false,
      $or: [
        { publicLead: { $ne: true } }, // regular leads
        { leadAssignedTo: { $ne: null, $exists: true, $not: { $size: 0 } } } // or assigned public leads
      ],
      $and: [
        {
          $or: [
            { addedBy: addedBy },
            { adminOwner: addedBy }
          ]
        }
      ]
    });

    const unassignedLeads = await Lead.countDocuments({
      deleted: false,
      closed: false,
      negative: false,
      publicLead: { $ne: true },
      $or: [
        { addedBy: addedBy },
        { adminOwner: addedBy }
      ],
      $or: [
        { leadAssignedTo: null },
        { leadAssignedTo: { $size: 0 } }
      ]
    });

    const assignedLeads = await Lead.countDocuments({
      deleted: false,
      closed: false,
      negative: false,
      $or: [
        { addedBy: addedBy },
        { adminOwner: addedBy }
      ],
      leadAssignedTo: { $ne: null, $exists: true, $not: { $size: 0 } },
    });

    const closedLeads = await Lead.countDocuments({
      deleted: false,
      $or: [
        { addedBy: addedBy },
        { adminOwner: addedBy }
      ],
      closed: true,
    });

    const totalEnquiries = await Lead.countDocuments({
      $or: [
        { addedBy: addedBy },
        { adminOwner: addedBy }
      ],
      publicLead: true,
      deleted: false
    });

    const totalEmployees = await Employee.countDocuments({
      addedBy: addedBy,
    });

    const unactiveEmployees = await Employee.countDocuments({
      addedBy: addedBy,
      blocked: true,
    });

    const totalTags = await Tag.countDocuments({
      addedBy: addedBy,
    });

    const totalPriorities = await Priority.countDocuments({
      addedBy: addedBy,
    });

    const totalSources = await LeadSources.countDocuments({
      addedBy: addedBy,
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalFollowups = await Followup.countDocuments();
    const todayFollowups = await Followup.countDocuments({
      createdAt: { $gte: todayStart }
    });

    res.status(200).json({
      success: true,
      message: "Dashboard stats fetched",
      data: {
        leads: {
          totalLeads,
          totalAssignedLeads: assignedLeads,
          totalUnassignedLeads: unassignedLeads,
          totalClosedLeads: closedLeads,
          totalEnquiries
        },
        employees: {
          totalEmployees,
          totalUnactiveEmployees: unactiveEmployees,
        },
        followups: {
          totalFollowups,
          todayFollowups,
        },
        tags: totalTags,
        priorities: totalPriorities,
        sources: totalSources,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const employeeDashboard = async (req, res) => {
  try {
    const employeeId = req.params.empId;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required"
      });
    }

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    const employeeData = await Employee.findById(employeeObjectId);
    const target = employeeData ? (employeeData.target || 80) : 80;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

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
            {
              $match: {
                $expr: { $eq: ["$leadId", "$$leadId"] },
              },
            },
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
            {
              "latestFollowup.0.followedBy": {
                $ne: employeeObjectId,
              },
            },
          ],
        },
      },
      { $count: "total" }
    ]);

    const pendingLeads = pendingLeadsResult[0]?.total || 0;
    const completionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

    const totalFollowups = await Followup.countDocuments({
      followedBy: employeeObjectId
    });

    const todayFollowups = await Followup.countDocuments({
      followedBy: employeeObjectId,
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd
      }
    });

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

    const todayReminders = todayRemindersResult.length;


    // 🔴 MISSED LEADS - DYNAMIC ONLY
    const missedLeadsResult = await Followup.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$leadId", latestFollowup: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latestFollowup" } },
      { $match: { nextFollowupDate: { $lt: todayStart } } },
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


    const achievement = target > 0 ? Math.round((todayFollowups / target) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalLeads,
        pendingLeads,
        closedLeads,
        negativeLeads,
        totalFollowups,
        todayFollowups,
        todayReminders,
        missedLeads,
        completionRate,
        target,
        achievement
      }
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Dashboard fetch failed",
      error: error.message
    });
  }
};

export const employeeDashboardChart = async (req, res) => {
  try {
    const employeeId = req.params.empId;
    const period = req.query.period || 'daily';

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    let startDate;
    let generateLabels = [];

    if (period === 'weekly') {
      startDate = moment().subtract(3, 'weeks').startOf('isoWeek');
      for (let i = 0; i < 4; i++) {
        generateLabels.push({
          label: moment().subtract(3 - i, 'weeks').startOf('isoWeek').format('DD MMM'),
          start: moment().subtract(3 - i, 'weeks').startOf('isoWeek').toDate(),
          end: moment().subtract(3 - i, 'weeks').endOf('isoWeek').toDate(),
          Reminders: 0,
          Missed: 0,
          Closed: 0
        });
      }
    } else if (period === 'monthly') {
      startDate = moment().subtract(5, 'months').startOf('month');
      for (let i = 0; i < 6; i++) {
        generateLabels.push({
          label: moment().subtract(5 - i, 'months').format('MMM YYYY'),
          start: moment().subtract(5 - i, 'months').startOf('month').toDate(),
          end: moment().subtract(5 - i, 'months').endOf('month').toDate(),
          Reminders: 0,
          Missed: 0,
          Closed: 0
        });
      }
    } else { // daily
      startDate = moment().subtract(6, 'days').startOf('day');
      for (let i = 0; i < 7; i++) {
        generateLabels.push({
          label: moment().subtract(6 - i, 'days').format('DD MMM'),
          start: moment().subtract(6 - i, 'days').startOf('day').toDate(),
          end: moment().subtract(6 - i, 'days').endOf('day').toDate(),
          Reminders: 0,
          Missed: 0,
          Closed: 0
        });
      }
    }

    // 1. Fetch Closed Leads
    const closedLeads = await Lead.find({
      leadAssignedTo: employeeObjectId,
      closed: true,
      negative: false,
      deleted: false,
      updatedAt: { $gte: startDate.toDate() }
    });

    closedLeads.forEach(lead => {
      const d = moment(lead.updatedAt);
      const bucket = generateLabels.find(b => d.isBetween(b.start, b.end, null, '[]'));
      if (bucket) bucket.Closed += 1;
    });

    // 2. Dynamic Calculation for Missed Leads
    const todayStart = moment().startOf('day');
    const dynamicMissedResult = await Followup.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$leadId", latestFollowup: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latestFollowup" } },
      { $match: { nextFollowupDate: { $lt: todayStart.toDate() } } },
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

    dynamicMissedResult.forEach(missed => {
      const bucket = generateLabels.find(b => moment(missed.nextFollowupDate).isBetween(b.start, b.end, null, '[]'));
      if (bucket) {
        if (!bucket.missedSet) bucket.missedSet = new Set();
        bucket.missedSet.add(missed.lead._id.toString());
      }
    });

    // 4. Fetch Followups for Reminders
    const followups = await Followup.find({
      followedBy: employeeObjectId,
      nextFollowupDate: { $gte: startDate.toDate() }
    }).populate('leadId');

    followups.forEach(f => {
      if (f.leadId && !f.leadId.deleted && !f.leadId.closed && !f.leadId.negative) {
        const d = moment(f.nextFollowupDate);
        const bucket = generateLabels.find(b => d.isBetween(b.start, b.end, null, '[]'));
        if (bucket) {
          bucket.Reminders += 1;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: generateLabels.map(b => ({
        name: b.label,
        Reminders: b.Reminders,
        Missed: b.missedSet ? b.missedSet.size : 0,
        Closed: b.Closed
      }))
    });

  } catch (error) {
    console.error("Dashboard Chart Error:", error);
    res.status(500).json({ success: false, message: "Dashboard chart fetch failed" });
  }
};
