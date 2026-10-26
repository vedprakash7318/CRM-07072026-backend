import Admin from "../models/admin.model.js";
import Employee from "../models/employee.model.js";
import Lead from "../models/lead.model.js";
import mongoose from "mongoose";
import Tag from '../models/tag.modal.js';

import FollowUp from '../models/followup.model.js'

import admin from "../Firebase/firebaseAdmin.js";

export const addLead = async (req, res) => {
  try {
    let addedBy = req.params.id;
    if (mongoose.Types.ObjectId.isValid(addedBy)) addedBy = new mongoose.Types.ObjectId(addedBy);
    const { name, phone, priority, sources, userType, leadAssignedTo, tags } = req.body;
    if (!phone) {
      return res.status(400).json({
        message: "phone is a required field!",
        success: false
      });
    }

    const isExistAddedBy = await Admin.findOne({ _id: addedBy }) || await Employee.findOne({ _id: addedBy });
    if (!isExistAddedBy) {
      return res.status(400).json({
        message: "Invalid addedBy Id !",
        success: false,
      });
    }

    let creatorId = addedBy;
    let adminOwnerId = addedBy;
    let finalAssignedTo = leadAssignedTo;
    const isEmployeeParam = await Employee.findById(addedBy);

    if (userType === "Employee" || isEmployeeParam) {
      const empId = isEmployeeParam ? addedBy : (leadAssignedTo || null);
      if (empId) {
        creatorId = empId;
        finalAssignedTo = [empId]; // auto-assign to employee!
        const employee = isEmployeeParam || await Employee.findById(empId);
        if (employee) {
          adminOwnerId = employee.addedBy;
        }
      }
    }

    // Contextual duplicate check
    const isEmployee = (userType === "Employee" || isEmployeeParam);
    const checkId = isEmployee ? adminOwnerId : addedBy;
    const isExistLead = await Lead.findOne({
      phone,
      deleted: false,
      $or: [
        { addedBy: checkId },
        { adminOwner: checkId }
      ]
    });

    if (isExistLead) {
      return res.status(400).json({
        message: isEmployee
          ? "Lead already exist in admin panel. Contact to him."
          : "This lead is already added!",
        success: false
      });
    }

    const assignedMap = {};
    if (finalAssignedTo) {
      const ids = Array.isArray(finalAssignedTo) ? finalAssignedTo : [finalAssignedTo];
      ids.forEach(id => {
        if (id) assignedMap[id.toString()] = new Date();
      });
    }

    const newLead = await Lead.create({
      name: name,
      phone: phone,
      priority: priority,
      sources: sources,
      tags: tags || [],
      addedBy: creatorId,
      adminOwner: adminOwnerId,
      leadAssignedTo: finalAssignedTo,
      addedByType: (userType === "Employee" || isEmployeeParam) ? "Employee" : "Admin",
      assignedAtMap: assignedMap,
      leadAssignedAt: finalAssignedTo ? new Date() : null
    });

    return res.status(201).json({
      message: "Lead Added Successfully!",
      lead: newLead,
      success: true
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error! at the time of adding lead.",
      success: false
    });
  }
}

export const addManyLead = async (req, res) => {

  try {
    let addedBy = req.params.id;
    if (mongoose.Types.ObjectId.isValid(addedBy)) addedBy = new mongoose.Types.ObjectId(addedBy);
    const { leadsArray, userType } = req.body; // Leads is an array
    // console.log(leadsArray, "id: ", addedBy, "user", userType);
    // Validate input
    if (!leadsArray || !Array.isArray(leadsArray) || leadsArray.length === 0) {
      return res.status(400).json({
        message: "Leads array is required and cannot be empty!",
        success: false,
      });
    }

    const leads = [];

    const isEmployeeParam = await Employee.findById(addedBy);
    let creatorId = addedBy;
    let adminOwnerId = addedBy;

    if (userType === "Employee" || isEmployeeParam) {
      const employee = isEmployeeParam || await Employee.findById(addedBy);
      if (employee) {
        adminOwnerId = employee.addedBy;
        creatorId = employee._id;
      }
    }

    const existingPhones = await Lead.find({
      phone: { $in: leadsArray.map(lead => String(lead.phone).trim()) },
      deleted: false,
      $or: [
        { addedBy: adminOwnerId },
        { adminOwner: adminOwnerId }
      ]
    }).select("phone");

    const existingPhonesSet = new Set(existingPhones.map(lead => String(lead.phone).trim()));
    const duplicates = [];
    const processedPhones = new Set();

    for (const lead of leadsArray) {
      if (!lead.phone) {
        continue;
      }

      const phoneStr = String(lead.phone).trim();

      if (existingPhonesSet.has(phoneStr)) {
        duplicates.push({
          phone: phoneStr,
          name: lead.name || 'N/A',
          reason: "Lead already exists in database"
        });
      } else if (processedPhones.has(phoneStr)) {
        duplicates.push({
          phone: phoneStr,
          name: lead.name || 'N/A',
          reason: "Duplicate in import file"
        });
      } else {
        processedPhones.add(phoneStr);
        const finalAssignedTo = (userType === "Employee" || isEmployeeParam) ? [creatorId] : lead.leadAssignedTo;
        const assignedMap = {};
        if (finalAssignedTo) {
          const ids = Array.isArray(finalAssignedTo) ? finalAssignedTo : [finalAssignedTo];
          ids.forEach(id => {
            if (id) assignedMap[id.toString()] = new Date();
          });
        }

        leads.push({
          ...lead,
          phone: phoneStr,
          addedBy: creatorId,
          adminOwner: adminOwnerId,
          leadAssignedTo: finalAssignedTo,
          addedByType: (userType === "Employee" || isEmployeeParam) ? "Employee" : "Admin",
          assignedAtMap: assignedMap,
          leadAssignedAt: finalAssignedTo ? new Date() : null
        });
      }
    }

    // Insert new leads in bulk if there are any
    let insertedNewLeads = [];
    if (leads.length > 0) {
      insertedNewLeads = await Lead.insertMany(leads);
    }

    return res.status(201).json({
      message: leads.length > 0
        ? `${leads.length} lead(s) added successfully!`
        : "No new leads were added.",
      success: true,
      addedCount: leads.length,
      failedCount: duplicates.length,
      duplicates: duplicates
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error! at the time of adding leads in bulk.",
      success: false
    });
  }
};

export const getAllDeletedLeads = async (req, res) => {
  try {
    let addedBy = req.params.id;
    if (mongoose.Types.ObjectId.isValid(addedBy)) addedBy = new mongoose.Types.ObjectId(addedBy);
    const leads = await Lead.find({
      $or: [
        { addedBy: addedBy },
        { adminOwner: addedBy }
      ],
      deleted: true
    })
      .populate('leadAssignedTo')
      .populate('leadStatus')
      .populate("priority")
      .populate("sources")
      .populate("tags");

    if (!leads || leads.length === 0) {
      return res.status(200).json({
        message: "No deleted leads found.",
        success: true,
        leads: []
      });
    }

    return res.status(200).json({
      message: "Deleted leads fetched successfully!",
      success: true,
      leads
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error while fetching deleted leads",
      success: false
    });
  }
};

export const getAllLeads = async (req, res) => {
  try {
    let addedBy = req.params.id;
    if (mongoose.Types.ObjectId.isValid(addedBy)) addedBy = new mongoose.Types.ObjectId(addedBy);

    const { leadAssignedTo, tags } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Base query
    const baseQuery = {
      $or: [
        { addedBy },
        { adminOwner: addedBy }
      ],
      deleted: false,
      closed: false,
      negative: false,
      publicLead: { $ne: true }
    };

    // Optional filters
    if (leadAssignedTo && leadAssignedTo !== 'null') {
      baseQuery.leadAssignedTo = leadAssignedTo;
    }

    if (tags && tags !== 'null') {
      const tagIds = Array.isArray(tags) ? tags : tags.split(',');
      baseQuery.tags = { $all: tagIds };
    }

    if (req.query.searchQuery) {
      const searchRegex = new RegExp(req.query.searchQuery, 'i');
      const searchCondition = {
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex }
        ]
      };
      if (baseQuery.$or) {
        baseQuery.$and = [
          { $or: baseQuery.$or },
          searchCondition
        ];
        delete baseQuery.$or;
      } else {
        baseQuery.$or = searchCondition.$or;
      }
    }

    // Fetch paginated leads and count
    const [leads, totalLeads] = await Promise.all([
      Lead.find(baseQuery)
        .skip(skip)
        .limit(limit)
        .populate('leadAssignedTo')
        .populate('leadStatus')
        .populate('priority')
        .populate('sources')
        .populate('services')
        .populate('tags'),
      Lead.countDocuments(baseQuery)
    ]);

    // Fetch additional statistics
    const [
      totalAssignedLeads,
      totalUnassignedLeads,
      totalClosedLeads,
      totalNegativeLeads
    ] = await Promise.all([
      Lead.countDocuments({
        $or: [{ addedBy }, { adminOwner: addedBy }],
        deleted: false,
        closed: false,
        negative: false,
        leadAssignedTo: { $ne: null, $exists: true, $not: { $size: 0 } }
      }),
      Lead.countDocuments({
        $or: [{ addedBy }, { adminOwner: addedBy }],
        deleted: false,
        closed: false,
        negative: false,
        publicLead: { $ne: true }, // Exclude unassigned enquiries
        $or: [
          { leadAssignedTo: null },
          { leadAssignedTo: { $size: 0 } }
        ]
      }),
      Lead.countDocuments({
        $or: [{ addedBy }, { adminOwner: addedBy }],
        deleted: false,
        closed: true
      }),

      Lead.countDocuments({
        $or: [{ addedBy }, { adminOwner: addedBy }],
        deleted: false,
        negative: true
      })
    ]);

    const totalPages = Math.ceil(totalLeads / limit);

    return res.status(200).json({
      success: true,
      leads,
      totalLeads,
      totalPages,
      currentPage: page,
      totalAssignedLeads,
      totalUnassignedLeads,
      totalClosedLeads,
      totalNegativeLeads
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
      error: error.message
    });
  }
};

// GET /api/leads/search?query=keyword
export const searchLeads = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ success: false, message: "Query is required" });
    }

    const leads = await Lead.find({
      deleted: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .populate('leadAssignedTo')
      .populate('leadStatus')
      .populate('priority')
      .populate('sources')
      .populate('tags');

    return res.status(200).json({ success: true, leads });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Search failed", error: error.message });
  }
};

export const getAssignedLeads = async (req, res) => {
  try {
    let addedBy = req.params.id;
    if (mongoose.Types.ObjectId.isValid(addedBy)) addedBy = new mongoose.Types.ObjectId(addedBy);
    const { leadAssignedTo, tags } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Base query: addedBy and leadAssignedTo is not null
    const query = {
      $or: [
        { addedBy: addedBy },
        { adminOwner: addedBy }
      ],
      leadAssignedTo: { $ne: null, $exists: true, $not: { $size: 0 } },
      deleted: false,
      closed: false,
      negative: false
    };

    // Optional filter: specific assignee
    if (leadAssignedTo && leadAssignedTo !== 'null') {
      query.leadAssignedTo = leadAssignedTo;
    }

    // Optional filter: tags (must include all)
    if (tags && tags !== 'null') {
      const tagIds = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $all: tagIds };
    }


    if (req.query.searchQuery) {
      const searchRegex = new RegExp(req.query.searchQuery, 'i');
      const searchCondition = {
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex }
        ]
      };
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          searchCondition
        ];
        delete query.$or;
      } else {
        query.$or = searchCondition.$or;
      }
    }
    const [leads, totalLeads] = await Promise.all([
      Lead.find(query)
        .skip(skip)
        .limit(limit)
        .populate('leadAssignedTo')
        .populate('leadStatus')
        .populate('priority')
        .populate('sources')
        .populate('tags')
        .populate('services'),
      Lead.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalLeads / limit);

    return res.status(200).json({
      message: "Assigned leads fetched successfully!",
      success: true,
      leads,
      totalLeads,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error while fetching assigned leads",
      success: false
    });
  }
};

export const getUnassignedLeads = async (req, res) => {
  try {
    let addedBy = req.params.id;
    if (mongoose.Types.ObjectId.isValid(addedBy)) addedBy = new mongoose.Types.ObjectId(addedBy);
    const { tags } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Base query: addedBy and unassigned leads
    const query = {
      $or: [
        { addedBy: addedBy },
        { adminOwner: addedBy }
      ],
      $or: [
        { leadAssignedTo: null },
        { leadAssignedTo: { $size: 0 } }
      ],
      deleted: false,
      closed: false,
      negative: false,
      publicLead: { $ne: true }
    };

    // Optional filter: tags (must include all)
    if (tags && tags !== 'null') {
      const tagIds = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $all: tagIds };
    }


    if (req.query.searchQuery) {
      const searchRegex = new RegExp(req.query.searchQuery, 'i');
      const searchCondition = {
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex }
        ]
      };
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          searchCondition
        ];
        delete query.$or;
      } else {
        query.$or = searchCondition.$or;
      }
    }
    const [leads, totalLeads] = await Promise.all([
      Lead.find(query)
        .skip(skip)
        .limit(limit)
        .populate('leadAssignedTo')
        .populate('services')
        .populate('leadStatus')
        .populate('priority')
        .populate('sources')
        .populate('tags'),
      Lead.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalLeads / limit);

    return res.status(200).json({
      message: "Unassigned leads fetched successfully!",
      success: true,
      leads,
      totalLeads,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error while fetching unassigned leads",
      success: false
    });
  }
};

export const employeesAllLeads = async (req, res) => {
  try {
    const employeeId = new mongoose.Types.ObjectId(req.params.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const tagIds = req.query.tags ? req.query.tags.split(",") : [];
    const statusIds = req.query.status ? req.query.status.split(",") : [];
    const serviceIds = req.query.service ? req.query.service.split(",") : [];

    // Match stage
    const matchStage = {
      leadAssignedTo: employeeId,
      deleted: false,
      closed: false,
      negative: false
    };

    // Search
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Tag filter
    if (tagIds.length > 0) {
      const objectIdTags = tagIds.map(id => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (err) {
          return null;
        }
      }).filter(id => id !== null);

      if (objectIdTags.length > 0) {
        matchStage.tags = { $all: objectIdTags };
      } else {
        return res.status(200).json({
          success: true,
          leads: [],
          pagination: { totalRecords: 0, totalPages: 0, currentPage: page, limit }
        });
      }
    }

    // Status filter
    if (statusIds.length > 0) {
      const validStatusIds = statusIds.map(id => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (err) {
          return null;
        }
      }).filter(id => id !== null);

      if (validStatusIds.length > 0) {
        matchStage.leadStatus = { $in: validStatusIds };
      }
    }

    // Service filter
    if (serviceIds.length > 0) {
      const validServiceIds = serviceIds.map(id => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (err) {
          return null;
        }
      }).filter(id => id !== null);

      if (validServiceIds.length > 0) {
        matchStage.services = { $in: validServiceIds };
      }
    }

    // Get total count
    const totalCount = await Lead.countDocuments(matchStage);

    if (totalCount === 0) {
      return res.status(200).json({
        success: true,
        leads: [],
        pagination: { totalRecords: 0, totalPages: 0, currentPage: page, limit }
      });
    }

    // ============= FIXED AGGREGATION =============
    const leads = await Lead.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // FIRST: Group by _id to ensure uniqueness
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          phone: { $first: "$phone" },
          email: { $first: "$email" },
          sources: { $first: "$sources" },
          priority: { $first: "$priority" },
          leadAssignedTo: { $first: "$leadAssignedTo" },
          leadStatus: { $first: "$leadStatus" },
          services: { $first: "$services" },
          tags: { $first: "$tags" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          deleted: { $first: "$deleted" },
          closed: { $first: "$closed" },
          negative: { $first: "$negative" }
        }
      },

      // THEN do lookups
      {
        $lookup: {
          from: "tags",
          localField: "tags",
          foreignField: "_id",
          as: "tags"
        }
      },
      {
        $lookup: {
          from: "leadstatuses",
          localField: "leadStatus",
          foreignField: "_id",
          as: "leadStatus"
        }
      },
      {
        $lookup: {
          from: "services",
          localField: "services",
          foreignField: "_id",
          as: "services"
        }
      },
      {
        $lookup: {
          from: "followups",
          let: { leadId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$leadId", "$$leadId"] }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $project: {
                followupMessage: 1,
                createdAt: 1,
                followupType: 1
              }
            }
          ],
          as: "latestFollowup"
        }
      },
      {
        $unwind: {
          path: "$leadStatus",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: "$services",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    // Final deduplication (safety)
    const uniqueLeads = [];
    const seenIds = new Set();

    for (const lead of leads) {
      if (!seenIds.has(lead._id.toString())) {
        seenIds.add(lead._id.toString());
        uniqueLeads.push(lead);
      }
    }

    res.status(200).json({
      success: true,
      leads: uniqueLeads,
      pagination: {
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit
      }
    });

  } catch (error) {
    console.error('Error in employeesAllLeads:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const employeeClosedLeads = async (req, res) => {
  try {

    const employeeId = new mongoose.Types.ObjectId(req.params.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    // Build search filter
    const searchMatch = search
      ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }
      : {};

    const result = await Lead.aggregate([
      {
        $match: {
          leadAssignedTo: employeeId,
          closed: true,
          deleted: false,
          negative: false,
          ...searchMatch,
        }
      },

      {
        $facet: {
          data: [
            {
              $lookup: {
                from: "tags",
                localField: "tags",
                foreignField: "_id",
                as: "tags",
              },
            },
            {
              $lookup: {
                from: "leadstatuses",
                localField: "leadStatus",
                foreignField: "_id",
                as: "leadStatus",
              },
            },
            {
              $lookup: {
                from: "services",
                localField: "services",
                foreignField: "_id",
                as: "services",
              },
            },
            { $unwind: { path: "$leadStatus", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },

            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
          ],

          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ]);

    const leads = result[0].data;
    const totalRecords = result[0].totalCount[0]?.count || 0;

    res.status(200).json({
      success: true,
      leads,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
        limit,
      },
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const employeeNegativeLeads = async (req, res) => {
  try {

    const employeeId = new mongoose.Types.ObjectId(req.params.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    // Build search filter
    const searchMatch = search
      ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }
      : {};

    const result = await Lead.aggregate([
      {
        $match: {
          leadAssignedTo: employeeId,
          closed: false,
          deleted: false,
          negative: true,
          ...searchMatch,
        }
      },

      {
        $facet: {
          data: [

            {
              $lookup: {
                from: "tags",
                localField: "tags",
                foreignField: "_id",
                as: "tags",
              },
            },
            {
              $lookup: {
                from: "leadstatuses",
                localField: "leadStatus",
                foreignField: "_id",
                as: "leadStatus",
              },
            },
            {
              $lookup: {
                from: "services",
                localField: "services",
                foreignField: "_id",
                as: "services",
              },
            },

            { $unwind: { path: "$leadStatus", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },

            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }

          ],

          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ]);

    const leads = result[0].data;
    const totalRecords = result[0].totalCount[0]?.count || 0;

    res.status(200).json({
      success: true,
      leads,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
        limit
      }
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


export const getPendingLeadsByEmployee = async (req, res) => {
  try {
    const employeeId = new mongoose.Types.ObjectId(req.params.id);

    // ===============================
    // PAGINATION
    // ===============================
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ===============================
    // FILTERS - USING IDs
    // ===============================
    const search = req.query.search || "";
    const tagIds = req.query.tags ? req.query.tags.split(",") : [];
    const statusIds = req.query.status ? req.query.status.split(",") : [];
    const serviceIds = req.query.service ? req.query.service.split(",") : [];

    // ===============================
    // BASE MATCH
    // ===============================
    const matchStage = {
      leadAssignedTo: employeeId,
      closed: false,
      deleted: false,
      negative: false,
    };

    // 🔍 SEARCH
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 🏷 TAG FILTER - Using IDs directly
    if (tagIds.length > 0) {
      const validTagIds = tagIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (validTagIds.length) {
        matchStage.tags = { $all: validTagIds };
      }
    }

    // 📊 STATUS FILTER - Using IDs directly
    if (statusIds.length > 0) {
      const validStatusIds = statusIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (validStatusIds.length) {
        matchStage.leadStatus = { $in: validStatusIds };
      }
    }

    // 🛠 SERVICE FILTER - Using IDs directly
    if (serviceIds.length > 0) {
      const validServiceIds = serviceIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (validServiceIds.length) {
        matchStage.services = { $in: validServiceIds };
      }
    }

    // ===============================
    // AGGREGATION
    // ===============================
    const result = await Lead.aggregate([
      { $match: matchStage },

      // 🔁 LATEST FOLLOWUP
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

      // PENDING LOGIC
      {
        $match: {
          $or: [
            { latestFollowup: { $eq: [] } },
            {
              "latestFollowup.0.followedBy": {
                $ne: employeeId,
              },
            },
            {
              "latestFollowup.0.clientSpoken": false
            }
          ],
        },
      },

      // FACET
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },

            // Populate leadStatus
            {
              $lookup: {
                from: "leadstatuses",
                localField: "leadStatus",
                foreignField: "_id",
                as: "leadStatus",
              },
            },
            {
              $unwind: {
                path: "$leadStatus",
                preserveNullAndEmptyArrays: true,
              },
            },

            // Populate priority
            {
              $lookup: {
                from: "priorities",
                localField: "priority",
                foreignField: "_id",
                as: "priority",
              },
            },
            {
              $unwind: {
                path: "$priority",
                preserveNullAndEmptyArrays: true,
              },
            },

            // Populate sources
            {
              $lookup: {
                from: "leadsources",
                localField: "sources",
                foreignField: "_id",
                as: "sources",
              },
            },
            {
              $unwind: {
                path: "$sources",
                preserveNullAndEmptyArrays: true,
              },
            },

            // Populate tags
            {
              $lookup: {
                from: "tags",
                localField: "tags",
                foreignField: "_id",
                as: "tags",
              },
            },

            // Populate services
            {
              $lookup: {
                from: "services",
                localField: "services",
                foreignField: "_id",
                as: "services",
              },
            },
            {
              $unwind: {
                path: "$services",
                preserveNullAndEmptyArrays: true,
              },
            },

            // Populate assigned user
            {
              $lookup: {
                from: "users",
                localField: "leadAssignedTo",
                foreignField: "_id",
                as: "leadAssignedTo",
              },
            },
            {
              $unwind: {
                path: "$leadAssignedTo",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],

          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const leads = result[0].data;
    const totalRecords = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      success: true,
      message: "Fetched pending leads successfully!",
      leads,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error in getPendingLeadsByEmployee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error while fetching pending leads",
    });
  }
};


export const getTodayReminders = async (req, res) => {
  try {
    const employeeId = new mongoose.Types.ObjectId(req.params.id);

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const reminders = await FollowUp.aggregate([

      // ✅ STEP 1: Latest followup per lead
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$leadId",
          latestFollowup: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$latestFollowup" } },

      // ✅ STEP 2: Only today's reminders
      {
        $match: {
          nextFollowupDate: { $gte: startOfDay, $lte: endOfDay }
        }
      },

      // ✅ STEP 3: Lookup lead
      {
        $lookup: {
          from: "leads",
          localField: "leadId",
          foreignField: "_id",
          as: "lead"
        }
      },
      { $unwind: "$lead" },

      // ✅ STEP 4: Lead filters
      {
        $match: {
          "lead.deleted": false,
          "lead.closed": false,
          "lead.negative": false,
          "lead.leadAssignedTo": employeeId
        }
      },

      // ✅ STEP 5: Attach last followup (optional but useful)
      {
        $lookup: {
          from: "followups",
          let: { leadId: "$lead._id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$leadId", "$$leadId"] }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: "lastFollowup"
        }
      },
      {
        $addFields: {
          "lead.lastFollowup": { $arrayElemAt: ["$lastFollowup", 0] }
        }
      },

      { $replaceRoot: { newRoot: "$lead" } },

      // ✅ POPULATIONS
      {
        $lookup: {
          from: "sources",
          localField: "sources",
          foreignField: "_id",
          as: "sources"
        }
      },
      { $unwind: { path: "$sources", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "priorities",
          localField: "priority",
          foreignField: "_id",
          as: "priority"
        }
      },
      { $unwind: { path: "$priority", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "leadstatuses",
          localField: "leadStatus",
          foreignField: "_id",
          as: "leadStatus"
        }
      },
      { $unwind: { path: "$leadStatus", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "services",
          localField: "services",
          foreignField: "_id",
          as: "services"
        }
      },
      { $unwind: { path: "$services", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "tags",
          localField: "tags",
          foreignField: "_id",
          as: "tags"
        }
      },

      {
        $lookup: {
          from: "employees",
          localField: "leadAssignedTo",
          foreignField: "_id",
          as: "leadAssignedTo"
        }
      },
      { $unwind: { path: "$leadAssignedTo", preserveNullAndEmptyArrays: true } },

      { $sort: { createdAt: -1 } }
    ]);

    // ✅ All leads whose latest followup has nextFollowupDate = today = today's reminders
    return res.status(200).json({
      success: true,
      reminders
    });

  } catch (error) {
    console.error("Today reminders error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMissedLeadsByEmployee = async (req, res) => {
  try {
    const employeeId = new mongoose.Types.ObjectId(req.params.empId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const matchLead = {
      "lead.deleted": false,
      "lead.closed": false,
      "lead.negative": false,
      "lead.publicLead": { $ne: true },
      "lead.leadAssignedTo": employeeId
    };
    if (search) {
      matchLead.$or = [
        { "lead.name": { $regex: search, $options: "i" } },
        { "lead.phone": { $regex: search, $options: "i" } }
      ];
    }

    const aggregationPipeline = [
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
      { $match: matchLead },
      {
        $addFields: {
          "lead.lastFollowup": "$$ROOT",
          "lead.lastFollowupDate": "$createdAt",
          "lead.nextFollowupDate": "$nextFollowupDate"
        }
      },
      { $replaceRoot: { newRoot: "$lead" } },
      {
        $lookup: { from: "services", localField: "services", foreignField: "_id", as: "services" }
      },
      {
        $lookup: { from: "sources", localField: "sources", foreignField: "_id", as: "sources" }
      },
      {
        $lookup: { from: "priorities", localField: "priority", foreignField: "_id", as: "priority" }
      },
      {
        $lookup: { from: "leadstatuses", localField: "leadStatus", foreignField: "_id", as: "leadStatus" }
      },
      {
        $lookup: { from: "tags", localField: "tags", foreignField: "_id", as: "tags" }
      },
      { $sort: { createdAt: -1 } }
    ];

    // ✅ All leads whose latest followup has a past nextFollowupDate = missed
    const allLeads = await FollowUp.aggregate(aggregationPipeline);
    const totalRecords = allLeads.length;

    const paginatedData = allLeads.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      total: totalRecords,
      data: paginatedData,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
        limit,
      }
    });

  } catch (error) {
    console.error("Missed Leads Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch missed leads"
    });
  }
};






export const getTagsByAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const tags = await Tag.find({
      addedBy: new mongoose.Types.ObjectId(adminId),
      deleted: false
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      tags,
      message: "Tags fetched successfully"
    });

  } catch (error) {
    console.error("Error in getTagsByAdmin:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error",
      success: false
    });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    if (!leadId) {
      return res.status(404).json({
        message: "Lead Id not Found",
        success: false
      })
    }
    await Lead.findByIdAndUpdate({ _id: leadId }, { $set: { deleted: true } });
    return res.status(200).json({
      message: "Lead Deleted Successfully!",
      success: true
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error!, at the time of Deleting lead",
      success: false
    })
  }

}

export const restoreLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    // const {leadId} = req.body;
    if (!leadId) {
      return res.status(404).json({
        message: "Lead Id not Found",
        success: false
      })
    }
    await Lead.findByIdAndUpdate({ _id: leadId }, { $set: { deleted: false } });
    return res.status(200).json({
      message: "Lead Restored Successfully!",
      success: true
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error!, at the time of restoring lead",
      success: false
    })
  }

}

export const assignLead = async (req, res) => {
  try {
    const { leadIds, employeeIds } = req.body;

    if (
      !leadIds ||
      !Array.isArray(leadIds) ||
      leadIds.length === 0 ||
      !employeeIds ||
      !Array.isArray(employeeIds) ||
      employeeIds.length === 0
    ) {
      return res.status(400).json({
        message: "Lead IDs array and Employee IDs array are required!",
        success: false,
      });
    }

    const leads = await Lead.find({ _id: { $in: leadIds } });
    if (leads.length !== leadIds.length) {
      return res.status(404).json({
        message: "One or more leads not found",
        success: false,
      });
    }

    const employees = await Employee.find({ _id: { $in: employeeIds } });
    if (employees.length !== employeeIds.length) {
      return res.status(404).json({
        message: "One or more employees not found",
        success: false,
      });
    }

    const updatedLeads = [];
    const notificationsToSend = {
      added: {}, // empId -> count
      removed: {} // empId -> count
    };

    const bulkOperations = [];

    for (const lead of leads) {
      const previousAssignees = (lead.leadAssignedTo || []).map(id => id.toString());
      const newAssignees = employeeIds.map(id => id.toString());

      const removedAssignees = previousAssignees.filter(id => !newAssignees.includes(id));
      const addedAssignees = newAssignees.filter(id => !previousAssignees.includes(id));

      removedAssignees.forEach(empId => {
        notificationsToSend.removed[empId] = (notificationsToSend.removed[empId] || 0) + 1;
      });

      addedAssignees.forEach(empId => {
        notificationsToSend.added[empId] = (notificationsToSend.added[empId] || 0) + 1;
      });

      // Prepare Map for bulkWrite (Mongoose handles objects for Maps)
      const currentMap = lead.assignedAtMap ? Object.fromEntries(lead.assignedAtMap) : {};
      const newMap = {};
      employeeIds.forEach(empId => {
        const empIdStr = empId.toString();
        if (currentMap[empIdStr]) {
          newMap[empIdStr] = currentMap[empIdStr];
        } else {
          newMap[empIdStr] = new Date();
        }
      });

      bulkOperations.push({
        updateOne: {
          filter: { _id: lead._id },
          update: {
            $set: {
              leadAssignedTo: employeeIds,
              assignedAtMap: newMap,
              leadAssignedAt: new Date()
            }
          }
        }
      });
    }

    if (bulkOperations.length > 0) {
      await Lead.bulkWrite(bulkOperations);
    }

    /* ===============================
       🔔 SEND NOTIFICATIONS (NON-BLOCKING)
    =============================== */
    const sendNotifications = async () => {
      try {
        const notifyPromises = [];

        // Notify added employees
        for (const [empId, count] of Object.entries(notificationsToSend.added)) {
          notifyPromises.push((async () => {
            const emp = await Employee.findById(empId);
            if (emp?.fcmToken) {
              await admin.messaging().send({
                token: emp.fcmToken,
                notification: {
                  title: "📌 New Lead Assigned",
                  body: `You have been assigned ${count} lead(s).`,
                },
                data: { url: "/leads", type: "LEAD_ASSIGNED" },
                webpush: {
                  notification: {
                    title: "📌 New Lead Assigned",
                    body: `You have been assigned ${count} lead(s).`,
                    icon: "/favicon.ico",
                    sound: "default",
                    requireInteraction: true,
                  },
                  fcmOptions: { link: "/leads" }
                }
              });
            }
          })());
        }

        // Notify removed employees
        for (const [empId, count] of Object.entries(notificationsToSend.removed)) {
          notifyPromises.push((async () => {
            const emp = await Employee.findById(empId);
            if (emp?.fcmToken) {
              await admin.messaging().send({
                token: emp.fcmToken,
                notification: {
                  title: "🔔 Lead Unassigned",
                  body: `${count} lead(s) have been unassigned from your crm`,
                },
                data: { url: "/main", type: "LEAD_UNASSIGNED" },
                webpush: {
                  notification: {
                    title: "🔔 Lead Unassigned",
                    body: `${count} lead(s) have been unassigned from your crm`,
                    icon: "/favicon.ico",
                    sound: "default",
                    requireInteraction: true,
                  },
                  fcmOptions: { link: "/main" }
                }
              });
            }
          })());
        }

        await Promise.all(notifyPromises);
      } catch (notifyError) {
        console.log("Assign notify error:", notifyError.message);
      }
    };

    // Fire and forget
    sendNotifications();

    return res.status(200).json({
      message: "Employees assigned to all leads successfully",
      updatedLeads,
      success: true,
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error!",
      success: false,
    });
  }
};


export const unassignLeads = async (req, res) => {
  try {
    const { leadIds, employeeIdsToRemove } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        message: "Lead IDs array is required!",
        success: false,
      });
    }

    const uniqueLeadIds = [...new Set(leadIds.map(id => id?.toString()))].filter(Boolean);
    const leads = await Lead.find({ _id: { $in: uniqueLeadIds } });

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        message: "No leads found",
        success: false,
      });
    }

    const isUnassignAll = !Array.isArray(employeeIdsToRemove) || employeeIdsToRemove.length === 0;
    const removeSet = !isUnassignAll ? new Set(employeeIdsToRemove.map(id => id.toString())) : null;

    const notificationsToSend = {}; // empId -> count of unassigned leads
    const bulkOperations = [];

    for (const lead of leads) {
      const currentAssigned = (lead.leadAssignedTo || []).map(id => id.toString());
      let updatedAssigned = [];
      let removedAssignees = [];

      if (isUnassignAll) {
        updatedAssigned = [];
        removedAssignees = currentAssigned;
      } else {
        updatedAssigned = currentAssigned.filter(empId => !removeSet.has(empId));
        removedAssignees = currentAssigned.filter(empId => removeSet.has(empId));
      }

      removedAssignees.forEach(empId => {
        notificationsToSend[empId] = (notificationsToSend[empId] || 0) + 1;
      });

      const updateFields = {
        leadAssignedTo: updatedAssigned
      };

      if (updatedAssigned.length === 0) {
        updateFields.leadAssignedAt = null;
      }

      const unsetFields = {};
      if (isUnassignAll) {
        unsetFields.assignedAtMap = "";
      } else if (lead.assignedAtMap) {
        employeeIdsToRemove.forEach(empIdStr => {
          unsetFields[`assignedAtMap.${empIdStr.toString()}`] = "";
        });
      }

      const updateOp = { $set: updateFields };
      if (Object.keys(unsetFields).length > 0) {
        updateOp.$unset = unsetFields;
      }

      bulkOperations.push({
        updateOne: {
          filter: { _id: lead._id },
          update: updateOp
        }
      });
    }

    if (bulkOperations.length > 0) {
      await Lead.bulkWrite(bulkOperations);
    }

    /* ===============================
       🔔 SEND NOTIFICATIONS (NON-BLOCKING)
    =============================== */
    const sendNotifications = async () => {
      try {
        const empIdsToNotify = Object.keys(notificationsToSend);
        if (empIdsToNotify.length === 0) return;

        const employees = await Employee.find({ _id: { $in: empIdsToNotify } });
        const notifyPromises = [];

        for (const emp of employees) {
          const count = notificationsToSend[emp._id.toString()] || 1;
          notifyPromises.push((async () => {
            if (emp?.fcmToken) {
              await admin.messaging().send({
                token: emp.fcmToken,
                notification: {
                  title: "🔔 Lead Unassigned",
                  body: `${count} lead(s) have been unassigned from your crm`,
                },
                data: { url: "/main", type: "LEAD_UNASSIGNED" },
                webpush: {
                  notification: {
                    title: "🔔 Lead Unassigned",
                    body: `${count} lead(s) have been unassigned from your crm`,
                    icon: "/favicon.ico",
                    sound: "default",
                    requireInteraction: true,
                  },
                  fcmOptions: { link: "/main" }
                }
              });
            }
          })());
        }
        await Promise.all(notifyPromises);
      } catch (notifyError) {
        console.log("Unassign notify error:", notifyError?.message || notifyError);
      }
    };

    // Fire and forget safely
    sendNotifications().catch(err => console.log("Background notify error:", err));

    return res.status(200).json({
      message: isUnassignAll
        ? "Selected leads have been unassigned successfully"
        : "Selected employees have been unassigned successfully",
      updatedLeads: leads,
      success: true,
    });

  } catch (error) {
    console.error("Error in unassignLeads:", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error!",
      success: false,
    });
  }
};


export const updateLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const { name, phone, priority, sources, email, gender, dob, country, state, city, zipCode, leadStatus, tags } = req.body;
    const lead = await Lead.findOne({ _id: leadId })

    if (!lead) {
      return res.status(404).json({ message: " id not found", success: false })
    }
    if (name) lead.name = name;
    if (phone) lead.phone = phone;
    if (priority) lead.priority = priority;
    if (email) lead.email = email;
    if (gender) lead.gender = gender;
    if (dob) lead.dob = dob;
    if (sources) lead.sources = sources;
    if (country) lead.country = country;
    if (state) lead.state = state;
    if (city) lead.city = city;
    if (zipCode) lead.zipCode = zipCode;
    if (leadStatus) lead.leadStatus = leadStatus;
    if (tags) lead.tags = tags
    await lead.save();
    return res.status(201).json({
      message: "Lead Updated Successfully!",
      lead,
      success: true
    })

  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error!, at the time of Updating lead!.",
      success: false
    });
  }
}

export const closedLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const { userId, userType, remark } = req.body;
    if (!leadId) {
      return res.status(404).json({
        message: "Lead Id not Found",
        success: false
      })
    }
    const updatedLead = await Lead.findByIdAndUpdate(
      { _id: leadId },
      {
        $set: {
          closed: true,
          closedBy: userId || null,
          closedByType: userType || null,
          closedRemark: remark || "",
          closedAt: new Date()
        }
      },
      { new: true }
    );

    if (updatedLead && updatedLead.leadAssignedTo) {
      const assignedTo = Array.isArray(updatedLead.leadAssignedTo) ? updatedLead.leadAssignedTo : [updatedLead.leadAssignedTo];
      for (const empId of assignedTo) {
        if (empId) {
          await incrementDailyReport(empId, { closedLeads: 1 });
        }
      }
    }
    return res.status(200).json({
      message: "Lead Closed Successfully!",
      success: true
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error!, at the time of Closing lead",
      success: false
    })
  }

}

export const UnclosedLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    if (!leadId) {
      return res.status(404).json({
        message: "Lead Id not Found",
        success: false
      })
    }
    await Lead.findByIdAndUpdate({ _id: leadId }, { $set: { closed: false }, $unset: { closedAt: "" } });
    return res.status(200).json({
      message: "Lead Unclosed Successfully!",
      success: true
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error!, at the time of Unclosing lead",
      success: false
    })
  }

}

export const negativedLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const { userId, userType, remark } = req.body;
    if (!leadId) {
      return res.status(404).json({
        message: "Lead Id not Found",
        success: false
      })
    }
    const updatedLead = await Lead.findByIdAndUpdate(
      { _id: leadId },
      {
        $set: {
          negative: true,
          negativeBy: userId || null,
          negativeByType: userType || null,
          negativeRemark: remark || "",
          negativeAt: new Date()
        }
      },
      { new: true }
    );

    if (updatedLead && updatedLead.leadAssignedTo) {
      const assignedTo = Array.isArray(updatedLead.leadAssignedTo) ? updatedLead.leadAssignedTo : [updatedLead.leadAssignedTo];
      for (const empId of assignedTo) {
        if (empId) {
          await incrementDailyReport(empId, { negativeLeads: 1 });
        }
      }
    }
    return res.status(200).json({
      message: "Mark as Negative Successfully!",
      success: true
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error!, at the time of marks as Negative lead",
      success: false
    })
  }

}

export const UnnegativedLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    // const {leadId} = req.body;
    if (!leadId) {
      return res.status(404).json({
        message: "Lead Id not Found",
        success: false
      })
    }
    await Lead.findByIdAndUpdate({ _id: leadId }, { $set: { negative: false, negativeAt: null } });
    return res.status(200).json({
      message: "Mark as Negative Successfully!",
      success: true
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal Server Error!, at the time of marks as Negative lead",
      success: false
    })
  }

}



export const addPublicEnquiry = async (req, res) => {

  try {

    const {
      name,
      phone,
      email,
      services,
      slug,
      targetedEmployee
    } = req.body;

    // Find Admin
    const adminData = await Admin.findOne({
      adminSlug: slug
    });

    if (!adminData) {

      return res.status(404).json({
        success: false,
        message: "Invalid Form"
      });

    }

    // Duplicate Check
    const existingLead = await Lead.findOne({
      phone,
      adminOwner: adminData._id
    });

    if (existingLead) {

      return res.status(400).json({
        success: false,
        message: "Lead already exists"
      });

    }

    // Create Lead
    const lead = await Lead.create({

      name,
      phone,
      email,
      services,
      targetedEmployee: targetedEmployee || null,

      publicLead: true,

      adminOwner: adminData._id,

      addedBy: adminData._id,

      addedByType: "Admin"

    });

    // REALTIME EVENT
    try {
      global.io.emit("newPublicLead", {
        leadId: lead._id.toString(),
        adminOwner: adminData._id.toString(),
        targetedEmployee: lead.targetedEmployee ? lead.targetedEmployee.toString() : null
      });
    } catch (socketError) {
      console.log("Socket emit error:", socketError.message);
    }

    // ==============================
    // Get Target or All Employees Of This Admin
    // ==============================

    let employees = [];
    if (targetedEmployee) {
      employees = await Employee.find({
        _id: targetedEmployee,
        addedBy: adminData._id
      });
    } else {
      employees = await Employee.find({
        addedBy: adminData._id
      });
    }

    // ==============================
    // Send Notification To Selected Employees
    // ==============================

    try {

      for (const emp of employees) {

        if (emp?.fcmToken) {

          await admin.messaging().send({

            token: emp.fcmToken,

            notification: {
              title: "🔔 New Enquiry Lead",
              body: `${adminData.name} shared a new enquiry`,
            },

            data: {
              leadId: lead._id.toString(),
              type: "PUBLIC_LEAD"
            },

            webpush: {
              notification: {
                title: "🔔 New Enquiry Lead",
                body: `${adminData.name} shared a new enquiry`,
                icon: "/favicon.ico",
                sound: "default",
                requireInteraction: true,
              }
            }

          });

        }

      }

    } catch (notifyError) {

      console.log("Notification Error:", notifyError.message);

    }

    return res.status(201).json({
      success: true,
      message: "Enquiry Submitted",
      lead
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

};


export const getAvailablePublicLeads = async (req, res) => {

  try {

    const { employeeId } = req.params;

    // Find Employee
    const employee = await Employee.findById(employeeId);

    if (!employee) {

      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });

    }

    // Leads
    const leads = await Lead.find({

      publicLead: true,

      accepted: false,

      adminOwner: employee.addedBy,

      deleted: false,

      $or: [
        { targetedEmployee: null },
        { targetedEmployee: employeeId }
      ]

    })
      .populate('services')
      .sort({ createdAt: -1 });


    return res.status(200).json({
      success: true,
      leads
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false
    });

  }

};


export const acceptPublicLead = async (req, res) => {

  try {

    const {
      leadId,
      employeeId
    } = req.body;

    // Check if employee is eligible to accept this lead
    const checkLead = await Lead.findById(leadId);
    if (!checkLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    if (checkLead.targetedEmployee && checkLead.targetedEmployee.toString() !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "This lead is targeted to another employee"
      });
    }

    // IF LEAD IS ALREADY ASSIGNED/ACCEPTED, CREATE A REQUEST INSTEAD
    if (checkLead.accepted || (checkLead.leadAssignedTo && checkLead.leadAssignedTo.length > 0)) {
      // Find current owner
      let currentOwnerId = null;
      if (Array.isArray(checkLead.leadAssignedTo) && checkLead.leadAssignedTo.length > 0) {
        currentOwnerId = checkLead.leadAssignedTo[0];
      } else if (checkLead.acceptedBy) {
        currentOwnerId = checkLead.acceptedBy;
      }

      if (!currentOwnerId || currentOwnerId.toString() === employeeId) {
        return res.status(400).json({ success: false, message: "You already own this lead" });
      }

      // Check if there is already a pending request
      const LeadRequest = (await import("../models/leadRequest.model.js")).default;
      const existingReq = await LeadRequest.findOne({
        leadId,
        requestedBy: employeeId,
        status: "pending"
      });

      if (existingReq) {
        return res.status(400).json({ success: false, message: "A transfer request for this lead is already pending." });
      }

      // Create new Lead Request
      await LeadRequest.create({
        leadId,
        requestedBy: employeeId,
        currentOwner: currentOwnerId,
        adminId: checkLead.adminOwner
      });

      return res.status(200).json({
        success: true,
        message: "This lead is already assigned. A transfer request has been sent to the Admin."
      });
    }

    const lead = await Lead.findOneAndUpdate(

      {
        _id: leadId,
        accepted: false
      },

      {
        accepted: true,
        acceptedBy: employeeId,
        acceptedAt: new Date(),
        leadAssignedTo: [employeeId],
        leadAssignedAt: new Date()
      },

      {
        new: true
      }

    );

    if (!lead) {

      return res.status(400).json({
        success: false,
        message: "Failed to assign lead."
      });

    }

    // REALTIME EVENT
    global.io.emit("leadAccepted", {
      leadId: lead._id,
      employeeId
    });

    return res.status(200).json({
      success: true,
      message: "Lead Accepted",
      lead
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false
    });

  }

};

export const getAcceptedPublicLeads = async (req, res) => {

  try {

    const { employeeId } = req.params;

    // Check Employee
    const employee = await Employee.findById(employeeId);

    if (!employee) {

      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });

    }

    // Find Accepted Leads
    const leads = await Lead.find({

      publicLead: true,

      accepted: true,

      acceptedBy: employeeId,

      deleted: false

    })
      .populate("services")
      .populate("acceptedBy", "name email")
      .sort({ acceptedAt: -1 });

    return res.status(200).json({

      success: true,

      count: leads.length,

      leads

    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({

      success: false,

      message: "Server Error"

    });

  }

};

export const getAdminPublicEnquiries = async (req, res) => {
  try {
    const adminId = req.params.id;

    const leads = await Lead.find({
      $or: [
        { addedBy: adminId },
        { adminOwner: adminId }
      ],
      publicLead: true,
      deleted: false
    })
      .populate('leadAssignedTo')
      .populate('leadStatus')
      .populate('priority')
      .populate('sources')
      .populate('services')
      .populate('tags')
      .populate('acceptedBy')
      .populate('targetedEmployee')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

export const getEmployeeReport = async (req, res) => {
  try {
    const { empId, startDate, endDate, adminId } = req.query;

    const matchStage = {
      deleted: false,
      $and: [
        { leadAssignedTo: { $ne: null } },
        { leadAssignedTo: { $not: { $size: 0 } } }
      ]
    };

    if (empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All') {
      matchStage.leadAssignedTo = new mongoose.Types.ObjectId(empId);
    }

    // Date filter removed from matchStage to show overall pipeline snapshot
    // Action metrics (followups) will still be filtered by date.
    
    let trendDateMatch = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      trendDateMatch = { $gte: start, $lte: end };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35);
      thirtyDaysAgo.setHours(0,0,0,0);
      trendDateMatch = { $gte: thirtyDaysAgo };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const pipeline = [
      { $match: matchStage },
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
      { $unwind: '$leadAssignedTo' },
      // FIX: If a specific employee is selected, filter out the unwound documents of other employees
      ...(empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All'
        ? [{ $match: { leadAssignedTo: new mongoose.Types.ObjectId(empId) } }]
        : []),
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
                      { $ne: ['$latestFollowup.followedBy', '$leadAssignedTo'] }
                    ]
                  },
                  then: 'Pending'
                },
                {
                  case: {
                    $and: [
                      { $ne: ['$latestFollowup.nextFollowupDate', null] },
                      { $lt: ['$latestFollowup.nextFollowupDate', todayStart] },
                      { $eq: ['$latestFollowup.followedBy', '$leadAssignedTo'] }
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
                      { $eq: ['$latestFollowup.followedBy', '$leadAssignedTo'] }
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
        $facet: {
          employeeStats: [
            {
              $group: {
                _id: { empId: '$leadAssignedTo', category: '$reportCategory' },
                count: { $sum: 1 }
              }
            },
            {
              $group: {
                _id: '$_id.empId',
                categories: { $push: { k: '$_id.category', v: '$count' } },
                totalAssigned: { $sum: '$count' }
              }
            },
            { $addFields: { stats: { $arrayToObject: '$categories' } } },
            {
              $lookup: {
                from: 'employees',
                localField: '_id',
                foreignField: '_id',
                as: 'employeeDetails'
              }
            },
            ...(adminId
              ? [
                  {
                    $match: {
                      'employeeDetails.addedBy': new mongoose.Types.ObjectId(adminId)
                    }
                  }
                ]
              : []),
            {
              $project: {
                _id: 1,
                empName: { $arrayElemAt: ['$employeeDetails.empName', 0] },
                avatar: { $arrayElemAt: ['$employeeDetails.empProfile', 0] },
                target: { $ifNull: [{ $arrayElemAt: ['$employeeDetails.target', 0] }, 80] },
                totalAssigned: 1,
                Pending: { $ifNull: ['$stats.Pending', 0] },
                Missed: { $ifNull: ['$stats.Missed', 0] },
                Followups: { $ifNull: ['$stats.Followups', 0] },
                Reminder: { $ifNull: ['$stats.Reminder', 0] },
                Closed: { $ifNull: ['$stats.Closed', 0] },
                Negative: { $ifNull: ['$stats.Negative', 0] }
              }
            },
            { $sort: { totalAssigned: -1 } }
          ],
          globalStats: [
            {
              $group: {
                _id: '$reportCategory',
                count: { $sum: 1 }
              }
            }
          ],
          trendStats: [
            {
              $match: {
                $or: [
                  { leadAssignedAt: trendDateMatch },
                  { leadAssignedAt: { $exists: false }, createdAt: trendDateMatch },
                  { leadAssignedAt: null, createdAt: trendDateMatch }
                ]
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$leadAssignedAt', '$createdAt'] } }
                },
                count: { $sum: 1 },
                Pending: { $sum: { $cond: [{ $eq: ['$reportCategory', 'Pending'] }, 1, 0] } },
                Missed: { $sum: { $cond: [{ $eq: ['$reportCategory', 'Missed'] }, 1, 0] } },
                Followups: { $sum: { $cond: [{ $eq: ['$reportCategory', 'Followups'] }, 1, 0] } },
                Reminder: { $sum: { $cond: [{ $eq: ['$reportCategory', 'Reminder'] }, 1, 0] } },
                Closed: { $sum: { $cond: [{ $eq: ['$reportCategory', 'Closed'] }, 1, 0] } },
                Negative: { $sum: { $cond: [{ $eq: ['$reportCategory', 'Negative'] }, 1, 0] } }
              }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 }
          ]
        }
      }
    ];

    const results = await Lead.aggregate(pipeline);
    const data = results[0] || { employeeStats: [], globalStats: [], trendStats: [] };

    // Fetch today's followup counts for each employee
    const followupMatchStage = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      followupMatchStage.createdAt = { $gte: start, $lte: end };
    } else {
      followupMatchStage.createdAt = { $gte: todayStart, $lte: todayEnd };
    }

    if (empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All') {
      followupMatchStage.followedBy = new mongoose.Types.ObjectId(empId);
    }

    const todaysFollowupsResult = await FollowUp.aggregate([
      { $match: followupMatchStage },
      {
        $group: {
          _id: '$followedBy',
          count: { $sum: 1 }
        }
      }
    ]);

    const todaysFollowupsMap = {};
    let totalTodaysFollowups = 0;
    todaysFollowupsResult.forEach(item => {
      todaysFollowupsMap[item._id.toString()] = item.count;
      totalTodaysFollowups += item.count;
    });

    // Create a map to quickly find employees in data.employeeStats
    const empStatMap = {};
    data.employeeStats.forEach(emp => {
      empStatMap[emp._id.toString()] = emp;
    });

    // Check todaysFollowupsResult and add missing employees
    for (const item of todaysFollowupsResult) {
      const empIdStr = item._id.toString();
      if (!empStatMap[empIdStr]) {
         const empDetails = await Employee.findById(item._id).select('empName empProfile target');
         if (empDetails) {
            data.employeeStats.push({
               _id: item._id,
               empName: empDetails.empName,
               avatar: empDetails.empProfile,
               target: empDetails.target || 80,
               totalAssigned: 0,
               Pending: 0, Missed: 0, Followups: 0, Reminder: 0, Closed: 0, Negative: 0
            });
         }
      }
    }

    data.employeeStats.forEach(emp => {
      emp.TodaysFollowups = todaysFollowupsMap[emp._id.toString()] || 0;
    });

    const formattedGlobal = { Pending: 0, Missed: 0, Followups: 0, Reminder: 0, Closed: 0, Negative: 0, TotalAssigned: 0, TodaysFollowups: totalTodaysFollowups };
    data.globalStats.forEach(item => {
      formattedGlobal[item._id] = item.count;
      formattedGlobal.TotalAssigned += item.count;
    });

    // Fetch trend of Followup actions for the selected date range or last 30 days
    let trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - 30);
    let trendEnd = new Date();
    
    if (startDate && endDate) {
      trendStart = new Date(startDate);
      trendEnd = new Date(endDate);
      trendEnd.setHours(23, 59, 59, 999);
    }
    
    const trendFollowupMatchStage = {
      createdAt: { $gte: trendStart, $lte: trendEnd }
    };
    if (empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All') {
      trendFollowupMatchStage.followedBy = new mongoose.Types.ObjectId(empId);
    }
    const trendFollowupsResult = await FollowUp.aggregate([
      { $match: trendFollowupMatchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      }
    ]);

    const trendFollowupsMap = {};
    trendFollowupsResult.forEach(item => {
      trendFollowupsMap[item._id] = item.count;
    });

    // Merge missing dates from followups into trendStats
    const existingDates = new Set(data.trendStats.map(t => t._id));
    Object.keys(trendFollowupsMap).forEach(dateStr => {
      if (!existingDates.has(dateStr)) {
        data.trendStats.push({
          _id: dateStr, count: 0, Pending: 0, Missed: 0, Followups: 0, Reminder: 0, Closed: 0, Negative: 0
        });
      }
    });

    data.trendStats.sort((a, b) => a._id.localeCompare(b._id));
    data.trendStats.forEach(item => {
      item.ActionFollowups = trendFollowupsMap[item._id] || 0;
    });

    return res.status(200).json({
      success: true,
      employeeStats: data.employeeStats,
      globalStats: formattedGlobal,
      trendStats: data.trendStats
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate employee report',
      error: error.message
    });
  }
};

export const getEmployeeReportDetails = async (req, res) => {
  try {
    const { empId, targetDate, category } = req.query;

    if (!targetDate || !category) {
      return res.status(400).json({ success: false, message: 'Missing targetDate or category' });
    }

    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    if (category === 'Daily Followups') {
      const matchStage = { createdAt: { $gte: start, $lte: end } };
      if (empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All') {
        matchStage.followedBy = new mongoose.Types.ObjectId(empId);
      }
      
      const followups = await FollowUp.find(matchStage)
        .populate({
          path: 'leadId',
          match: { deleted: false, publicLead: { $ne: true } }
        })
        .populate('followupStatus')
        .populate('service')
        .populate('followedBy', 'empName')
        .sort({ createdAt: -1 });

      const filteredFollowups = followups.filter(f => f.leadId != null);
      
      const leadsList = filteredFollowups.map(f => ({
        _id: f.leadId._id,
        name: f.leadId.name,
        phone: f.leadId.phone,
        status: f.followupStatus ? f.followupStatus.leadStatusText : 'Pending',
        service: f.service ? f.service.servicesText : 'N/A',
        followedBy: f.followedBy ? f.followedBy.empName : 'N/A',
        message: f.followupMessage || 'No Message',
        nextFollowupDate: f.nextFollowupDate,
        lastFollowupDate: f.createdAt
      }));

      return res.status(200).json({ success: true, data: leadsList });
    }

    // For Missed or Closed Leads
    const matchStage = {
      deleted: false,
      publicLead: { $ne: true },
      $and: [
        { leadAssignedTo: { $ne: null } },
        { leadAssignedTo: { $not: { $size: 0 } } }
      ]
    };

    if (empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All') {
      matchStage.leadAssignedTo = new mongoose.Types.ObjectId(empId);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'followups',
          localField: '_id',
          foreignField: 'leadId',
          pipeline: [
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $lookup: { from: 'leadstatuses', localField: 'followupStatus', foreignField: '_id', as: 'statusData' } },
            { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'serviceData' } },
            { $lookup: { from: 'employees', localField: 'followedBy', foreignField: '_id', as: 'employeeData' } },
            { $unwind: { path: '$statusData', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$serviceData', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$employeeData', preserveNullAndEmptyArrays: true } }
          ],
          as: 'latestFollowup'
        }
      },
      {
        $addFields: {
          latestFollowup: { $arrayElemAt: ['$latestFollowup', 0] },
          trendDate: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$leadAssignedAt', '$createdAt'] } } }
        }
      },
      { $match: { trendDate: targetDate } },
      { $unwind: '$leadAssignedTo' },
      ...(empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All'
        ? [{ $match: { leadAssignedTo: new mongoose.Types.ObjectId(empId) } }]
        : []),
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
                      { $ne: ['$latestFollowup.followedBy', '$leadAssignedTo'] }
                    ]
                  },
                  then: 'Pending'
                },
                {
                  case: {
                    $and: [
                      { $ne: ['$latestFollowup.nextFollowupDate', null] },
                      { $lt: ['$latestFollowup.nextFollowupDate', todayStart] },
                      { $eq: ['$latestFollowup.followedBy', '$leadAssignedTo'] }
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
                      { $eq: ['$latestFollowup.followedBy', '$leadAssignedTo'] }
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
      { $match: { reportCategory: category.replace(' Leads', '') } }
    ];

    const results = await Lead.aggregate(pipeline);
    
    const leadsList = results.map(r => ({
      _id: r._id,
      name: r.name,
      phone: r.phone,
      status: (r.latestFollowup && r.latestFollowup.statusData) ? r.latestFollowup.statusData.leadStatusText : 'Pending',
      service: (r.latestFollowup && r.latestFollowup.serviceData) ? r.latestFollowup.serviceData.servicesText : 'N/A',
      followedBy: (r.latestFollowup && r.latestFollowup.employeeData) ? r.latestFollowup.employeeData.empName : 'N/A',
      message: r.latestFollowup ? r.latestFollowup.followupMessage : 'No followups',
      nextFollowupDate: r.latestFollowup ? r.latestFollowup.nextFollowupDate : null
    }));

    return res.status(200).json({ success: true, data: leadsList });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch details',
      error: error.message
    });
  }
};

export const getEmployeeActionDetails = async (req, res) => {
  try {
    const { empId, startDate, endDate, category } = req.query;

    if (!category) {
      return res.status(400).json({ success: false, message: 'Missing category' });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (category === 'TodaysFollowups') {
      const matchStage = { createdAt: { $gte: todayStart, $lte: todayEnd } };
      if (empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All') {
        matchStage.followedBy = new mongoose.Types.ObjectId(empId);
      }
      
      const followups = await FollowUp.find(matchStage)
        .populate({
          path: 'leadId',
          match: { deleted: false, publicLead: { $ne: true } }
        })
        .populate('followupStatus')
        .populate('service')
        .populate('followedBy', 'empName')
        .sort({ createdAt: -1 });

      const filteredFollowups = followups.filter(f => f.leadId != null);
      
      const leadsList = filteredFollowups.map(f => ({
        _id: f.leadId._id,
        name: f.leadId.name,
        phone: f.leadId.phone,
        status: f.followupStatus ? f.followupStatus.leadStatusText : 'Pending',
        service: f.service ? f.service.servicesText : 'N/A',
        followedBy: f.followedBy ? f.followedBy.empName : 'N/A',
        message: f.followupMessage || 'No Message',
        nextFollowupDate: f.nextFollowupDate
      }));

      return res.status(200).json({ success: true, data: leadsList });
    }

    // For Missed, Closed, Negative, Followups, Reminder, Pending
    const matchStage = {
      deleted: false,
      publicLead: { $ne: true },
      $and: [
        { leadAssignedTo: { $ne: null } },
        { leadAssignedTo: { $not: { $size: 0 } } }
      ]
    };

    if (empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All') {
      matchStage.leadAssignedTo = new mongoose.Types.ObjectId(empId);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: start, $lte: end };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'followups',
          localField: '_id',
          foreignField: 'leadId',
          pipeline: [
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $lookup: { from: 'leadstatuses', localField: 'followupStatus', foreignField: '_id', as: 'statusData' } },
            { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'serviceData' } },
            { $lookup: { from: 'employees', localField: 'followedBy', foreignField: '_id', as: 'employeeData' } },
            { $unwind: { path: '$statusData', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$serviceData', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$employeeData', preserveNullAndEmptyArrays: true } }
          ],
          as: 'latestFollowup'
        }
      },
      {
        $addFields: {
          latestFollowup: { $arrayElemAt: ['$latestFollowup', 0] }
        }
      },
      { $unwind: '$leadAssignedTo' },
      ...(empId && empId !== 'null' && empId !== 'undefined' && empId !== 'All'
        ? [{ $match: { leadAssignedTo: new mongoose.Types.ObjectId(empId) } }]
        : []),
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
                      { $ne: ['$latestFollowup.followedBy', '$leadAssignedTo'] }
                    ]
                  },
                  then: 'Pending'
                },
                {
                  case: {
                    $and: [
                      { $ne: ['$latestFollowup.nextFollowupDate', null] },
                      { $lt: ['$latestFollowup.nextFollowupDate', todayStart] },
                      { $eq: ['$latestFollowup.followedBy', '$leadAssignedTo'] }
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
                      { $eq: ['$latestFollowup.followedBy', '$leadAssignedTo'] }
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
      { $match: { reportCategory: category } }
    ];

    const results = await Lead.aggregate(pipeline);
    
    const leadsList = results.map(r => ({
      _id: r._id,
      name: r.name,
      phone: r.phone,
      status: (r.latestFollowup && r.latestFollowup.statusData) ? r.latestFollowup.statusData.leadStatusText : 'Pending',
      service: (r.latestFollowup && r.latestFollowup.serviceData) ? r.latestFollowup.serviceData.servicesText : 'N/A',
      followedBy: (r.latestFollowup && r.latestFollowup.employeeData) ? r.latestFollowup.employeeData.empName : 'N/A',
      message: r.latestFollowup ? r.latestFollowup.followupMessage : 'No followups',
      nextFollowupDate: r.latestFollowup ? r.latestFollowup.nextFollowupDate : null
    }));

    return res.status(200).json({ success: true, data: leadsList });

  } catch (error) {
    console.error("Error in getEmployeeActionDetails:", error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
