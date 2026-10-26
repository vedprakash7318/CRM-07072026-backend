import mongoose from "mongoose";
import Lead from "../models/lead.model.js";
import FollowUp from "../models/followup.model.js";

export const getEmployeeDashboardStats = async (employeeObjectId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Pipeline to categorize leads exactly like the Admin Report
  const pipeline = [
    {
      $match: {
        leadAssignedTo: employeeObjectId,
        deleted: false
      }
    },
    {
      $lookup: {
        from: 'followups',
        localField: '_id',
        foreignField: 'leadId',
        pipeline: [
          { $sort: { createdAt: -1 } },
          { $limit: 1 }
        ],
        as: 'latestFollowup'
      }
    },
    {
      $addFields: {
        latestFollowup: { $arrayElemAt: ['$latestFollowup', 0] }
      }
    },
    {
      $addFields: {
        reportCategory: {
          $switch: {
            branches: [
              { case: { $eq: ['$closed', true] }, then: 'Closed' },
              { case: { $eq: ['$negative', true] }, then: 'Negative' },
              {
                case: {
                  $or: [
                    { $eq: [{ $type: '$latestFollowup' }, 'missing'] },
                    { $eq: ['$latestFollowup', null] },
                    { $ne: ['$latestFollowup.followedBy', employeeObjectId] },
                    { $eq: ['$latestFollowup.clientSpoken', false] }
                  ]
                },
                then: 'Pending'
              },
              {
                case: {
                  $and: [
                    { $ne: ['$latestFollowup.nextFollowupDate', null] },
                    { $lt: ['$latestFollowup.nextFollowupDate', todayStart] },
                    { $eq: ['$latestFollowup.followedBy', employeeObjectId] }
                  ]
                },
                then: 'Missed'
              },
              {
                case: {
                  $and: [
                    { $ne: ['$latestFollowup.nextFollowupDate', null] },
                    { $gte: ['$latestFollowup.nextFollowupDate', todayStart] },
                    { $lte: ['$latestFollowup.nextFollowupDate', todayEnd] },
                    { $eq: ['$latestFollowup.followedBy', employeeObjectId] }
                  ]
                },
                then: 'Reminder'
              }
            ],
            default: 'Followups'
          }
        }
      }
    },
    {
      $group: {
        _id: '$reportCategory',
        count: { $sum: 1 }
      }
    }
  ];

  const results = await Lead.aggregate(pipeline);

  const stats = {
    TotalAssigned: 0,
    Pending: 0,
    Closed: 0,
    Negative: 0,
    Missed: 0,
    Reminder: 0,
    Followups: 0
  };

  results.forEach(item => {
    stats[item._id] = item.count;
    if (item._id !== 'Closed' && item._id !== 'Negative') {
      stats.TotalAssigned += item.count;
    }
  });

  const totalFollowups = await FollowUp.countDocuments({
    followedBy: employeeObjectId
  });

  const todayFollowups = await FollowUp.countDocuments({
    followedBy: employeeObjectId,
    createdAt: { $gte: todayStart, $lte: todayEnd }
  });

  return {
    totalLeads: stats.TotalAssigned,
    pendingLeads: stats.Pending,
    closedLeads: stats.Closed,
    negativeLeads: stats.Negative,
    missedLeads: stats.Missed,
    todayReminders: stats.Reminder,
    totalFollowups: totalFollowups,
    todayFollowups: todayFollowups
  };
};
