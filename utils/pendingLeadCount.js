import mongoose from "mongoose";
import Lead from "../models/lead.model.js";

export const getPendingLeadCount = async (employeeId) => {
  const result = await Lead.aggregate([
    {
      $match: {
        leadAssignedTo: new mongoose.Types.ObjectId(employeeId),
        closed: false,
        deleted: false,
        negative: false,
      },
    },

    // latest followup
    {
      $lookup: {
        from: "followups",
        localField: "_id",
        foreignField: "leadId",
        pipeline: [
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: "latestFollowup",
      },
    },

    // exclude self-followed
    {
      $match: {
        $or: [
          { latestFollowup: { $eq: [] } },
          {
            "latestFollowup.0.followedBy": {
              $ne: new mongoose.Types.ObjectId(employeeId),
            },
          },
          {
            "latestFollowup.0.clientSpoken": false
          }
        ],
      },
    },

    // count only
    {
      $count: "pendingCount",
    },
  ]);

  return result.length > 0 ? result[0].pendingCount : 0;
};
