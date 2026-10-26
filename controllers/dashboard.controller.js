import Lead from "../models/lead.model.js";
import Employee from "../models/employee.model.js";
import Tag from "../models/tag.modal.js";
import Priority from "../models/priority.model.js";
import LeadSources from "../models/leadSources.model.js";
import Followup from "../models/followup.model.js";
import EmployeeReportNew from "../models/employeeReportNew.model.js";
import mongoose from "mongoose";
import moment from "moment";
import { getEmployeeDashboardStats } from "../utils/employeeStats.js";

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

    const stats = await getEmployeeDashboardStats(employeeObjectId);

    const completionRate = stats.totalLeads > 0 ? Math.round((stats.closedLeads / stats.totalLeads) * 100) : 0;
    const achievement = target > 0 ? Math.round((stats.todayFollowups / target) * 100) : 0;

    const leadsForTags = await Lead.find({
      $or: [
        { leadAssignedTo: employeeObjectId },
        { addedBy: employeeObjectId, addedByType: "Employee" }
      ],
      deleted: false
    }).populate({
      path: 'tags',
      populate: { path: 'parentId' }
    }).select('tags').lean();

    const collegeNames = new Set();
    leadsForTags.forEach(lead => {
      if (lead.tags && Array.isArray(lead.tags)) {
        lead.tags.forEach(tag => {
          if (tag && tag.tagName && tag.parentId && tag.parentId.tagParentName) {
            if (tag.parentId.tagParentName.toLowerCase() === 'college' || tag.parentId.tagParentName.toLowerCase() === 'colleges') {
              collegeNames.add(tag.tagName);
            }
          }
        });
      }
    });
    const assignedColleges = Array.from(collegeNames);

    res.status(200).json({
      success: true,
      data: {
        totalLeads: stats.totalLeads,
        pendingLeads: stats.pendingLeads,
        closedLeads: stats.closedLeads,
        negativeLeads: stats.negativeLeads,
        totalFollowups: stats.totalFollowups,
        todayFollowups: stats.todayFollowups,
        todayReminders: stats.todayReminders,
        missedLeads: stats.missedLeads,
        completionRate,
        target,
        achievement,
        assignedColleges
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

    // Fetch snapshot data
    const snapshots = await EmployeeReportNew.find({
      employeeId: employeeObjectId,
      reportDate: { $gte: startDate.toDate() }
    });

    snapshots.forEach(snapshot => {
      const d = moment(snapshot.reportDate);
      const bucket = generateLabels.find(b => d.isBetween(b.start, b.end, null, '[]'));
      if (bucket) {
        bucket.Closed += (snapshot.closedLeads || 0);
        bucket.Missed = (bucket.Missed || 0) + (snapshot.missedLeads || 0);
        bucket.Reminders += (snapshot.reminders || 0);
        bucket.Negative = (bucket.Negative || 0) + (snapshot.negativeLeads || 0);
        bucket.Followups = (bucket.Followups || 0) + (snapshot.followups || 0);
      }
    });

    res.status(200).json({
      success: true,
      data: generateLabels.map(b => ({
        name: b.label,
        Reminders: b.Reminders,
        Missed: b.Missed,
        Closed: b.Closed,
        Negative: b.Negative || 0,
        Followups: b.Followups || 0
      }))
    });

  } catch (error) {
    console.error("Dashboard Chart Error:", error);
    res.status(500).json({ success: false, message: "Dashboard chart fetch failed" });
  }
};
