import Lead from "../models/lead.model.js";
import Followup from "../models/followup.model.js";
import Employee from "../models/employee.model.js";
import Admin from "../models/admin.model.js";
import mongoose from "mongoose";
import Tag from "../models/tag.modal.js";
import jwt from "jsonwebtoken";

import admin from "../Firebase/firebaseAdmin.js";
import { getPendingLeadCount } from "../utils/pendingLeadCount.js";

export const addEmployee = async (req, res) => {
  try {
    const addedBy = req.params.id;

    const {
      empName,
      empPhoneNumber,
      empEmail,
      empPassword,
      empGender,
      empDOB,
      empCity,
      empState,
      empZipCode,
      empCountry,
      empDesignation,
      target,
    } = req.body;

    if (!empName || !empPhoneNumber || !empEmail || !empPassword) {
      return res.status(400).json({
        message: "All fields are required!",
        success: false,
      });
    }

    const adminExists = await Admin.findById(addedBy);
    if (!adminExists) {
      return res.status(400).json({
        message: "Invalid Admin ID!",
        success: false,
      });
    }

    const isExist = await Employee.findOne({
      $or: [{ empPhoneNumber }, { empEmail }],
    });

    if (isExist) {
      return res.status(400).json({
        message: "Employee already exists!",
        success: false,
      });
    }

    const newEmployee = await Employee.create({
      empName,
      empPhoneNumber,
      empEmail,
      empPassword,
      empGender,
      empDOB,
      empDesignation,
      empCity,
      empZipCode,
      empCountry,
      empState,
      addedBy,
      target: target || 80, // ✅ default target
    });

    return res.status(201).json({
      message: "Employee added successfully!",
      employee: newEmployee,
      success: true,
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
    });
  }
};


export const updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;

    const {
      empName,
      empPhoneNumber,
      empEmail,
      empGender,
      empDOB,
      empDesignation,
      empCity,
      empState,
      empZipCode,
      empCountry,
      blocked,
      target // ✅ added
    } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        message: "Employee not found!",
        success: false,
      });
    }

    // Check duplicate
    if (empPhoneNumber || empEmail) {
      const duplicate = await Employee.findOne({
        $or: [
          { empPhoneNumber, _id: { $ne: employeeId } },
          { empEmail, _id: { $ne: employeeId } },
        ],
      });

      if (duplicate) {
        return res.status(400).json({
          message: "Email or phone already exists!",
          success: false,
        });
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      {
        empName,
        empPhoneNumber,
        empEmail,
        empGender,
        empDOB,
        empDesignation,
        empCity,
        empState,
        empCountry,
        empZipCode,
        blocked,
        target, // ✅ update target
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Employee updated successfully!",
      employee: updatedEmployee,
      success: true,
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
    });
  }
};




export const loginEmployee = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Please Provide username or password!",
        success: false,
      });
    }

    const isExistEmployee = await Employee.findOne({
      $or: [{ empPhoneNumber: username }, { empEmail: username }],
    });

    if (!isExistEmployee) {
      return res.status(400).json({
        message: "Employee is not registered with this username!",
        success: false,
      });
    }

    if (isExistEmployee.empPassword !== password) {
      return res.status(400).json({
        message: "Please Enter a valid Password!",
        success: false,
      });
    }

    if (isExistEmployee.blocked === true) {
      return res.status(400).json({
        message: "You are blocked by your Admin! Contact your Admin",
        success: false,
      });
    }

    const isExistAdmin = await Admin.findById(isExistEmployee.addedBy);
    if (isExistAdmin?.blocked === true) {
      return res.status(400).json({
        message: "You are blocked by your Admin! Contact your Admin",
        success: false,
      });
    }

    /* ===============================
       🔔 PENDING LEAD NOTIFICATION
    =============================== */
    try {
      if (isExistEmployee.fcmToken) {
        const pendingCount = await getPendingLeadCount(isExistEmployee._id);

        if (pendingCount > 0) {
          await admin.messaging().send({
            token: isExistEmployee.fcmToken,
            notification: {
              title: "📌 Pending Leads Alert",
              body: `You have ${pendingCount} pending leads to follow up`,
            },
            data: {
              url: "/pending",
              type: "PENDING_LEAD"
            },
            webpush: {
              notification: {
                title: "📌 Pending Leads Alert",
                body: `You have ${pendingCount} pending leads to follow up`,
                icon: "/favicon.ico",
                sound: "default",
                requireInteraction: true,
              },
              fcmOptions: {
                link: "/pending"
              }
            }
          });
        }
      }
    } catch (notifyError) {
      console.log("Pending lead notify error:", notifyError.message);
      // ❗ login ko kabhi fail nahi karega
    }

    /* ===============================
       ✅ LOGIN RESPONSE
    =============================== */
    const token = jwt.sign(
      { id: isExistEmployee._id, role: "employee", addedBy: isExistEmployee.addedBy },
      process.env.JWT_SECRET || "fallback_secret_key"
    );

    return res.status(200).json({
      message: "You are Logged in Successfully!",
      employee: isExistEmployee,
      token,
      success: true,
    });

  } catch (error) {
    return res.status(500).json({
      message:
        error.message ||
        "Internal server error!, at the time of employee login.",
      success: false,
    });
  }
};


export const getAllEmployees = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const nopage = req.query.nopage === 'true';
        
        // Pagination parameters from query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.rows) || 50;
        const skip = (page - 1) * limit;
        
        // Search parameter
        const searchQuery = req.query.search || '';
        
        // Build filter object for MongoDB query
        let filterQuery = { addedBy: addedBy, blocked: false }; // Exclude blocked employees
        
        // Add search functionality if search parameter is provided
        if (searchQuery) {
            filterQuery = {
                ...filterQuery,
                $or: [
                    { empName: { $regex: searchQuery, $options: 'i' } },
                    { empEmail: { $regex: searchQuery, $options: 'i' } },
                    { empPhoneNumber: { $regex: searchQuery, $options: 'i' } }
                ]
            };
        }
        
        // Get total count for pagination metadata
        const totalEmployees = await Employee.countDocuments(filterQuery);
        
        // Fetch employees
        let queryBuilder = Employee.find(filterQuery).sort({ createdAt: -1 });
        if (!nopage) {
            queryBuilder = queryBuilder.skip(skip).limit(limit);
        }
        const employees = await queryBuilder;
        
        if (!employees || employees.length === 0) {
            return res.status(200).json({
                message: "No employees found matching your criteria.",
                employees: [],
                pagination: {
                    page,
                    limit,
                    totalRecords: 0,
                    totalPages: 0
                },
                success: true
            });
        }
        
        return res.status(200).json({
            message: "Employees retrieved successfully.",
            employees,
            pagination: {
                page,
                limit,
                totalRecords: totalEmployees,
                totalPages: Math.ceil(totalEmployees / limit)
            },
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error occurred while fetching employees.",
            success: false
        });
    }
};


export const getBlockedEmployees = async (req, res) => {
    try {
        const addedBy = req.params.id;

        // Pagination parameters from query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.rows) || 15;
        const skip = (page - 1) * limit;

        // Search parameter
        const searchQuery = req.query.search || '';

        // Build filter object for MongoDB query
        let filterQuery = { addedBy: addedBy, blocked: true }; // Only blocked employees

        // Add search functionality if search parameter is provided
        if (searchQuery) {
            filterQuery = {
                ...filterQuery,
                $or: [
                    { empName: { $regex: searchQuery, $options: 'i' } },
                    { empEmail: { $regex: searchQuery, $options: 'i' } },
                    { empPhoneNumber: { $regex: searchQuery, $options: 'i' } }
                ]
            };
        }

        // Get total count for pagination metadata
        const totalEmployees = await Employee.countDocuments(filterQuery);

        // Fetch employees with pagination
        const employees = await Employee.find(filterQuery)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }); // Sort by creation date, newest first

        if (!employees || employees.length === 0) {
            return res.status(200).json({
                message: "No blocked employees found matching your criteria.",
                employees: [],
                pagination: {
                    page,
                    limit,
                    totalRecords: 0,
                    totalPages: 0
                },
                success: true
            });
        }

        return res.status(200).json({
            message: "Blocked employees retrieved successfully.",
            employees,
            pagination: {
                page,
                limit,
                totalRecords: totalEmployees,
                totalPages: Math.ceil(totalEmployees / limit)
            },
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error occurred while fetching blocked employees.",
            success: false
        });
    }
};


export const getEmployeeById = async (req, res)=>{
    try {
        const addedBy = req.params.id;
        const {empId} = req.body;
        const employee = await Employee.findOne({_id:empId, addedBy:addedBy});
        if(!employee){
            return res.status(404).json({
                message:"Employee is not found in Database!.",
                success:false
            })
        }
        return res.status(200).json({
            message:"Emaployee Found.",
            employee,
            success:true
        })
    } catch (error) {
        return res.status(500).json({
            message:error.message || "Internal server error!, at the time of fetching employees .",
            success:false
        })        
    }
}

export const blockEmployee = async(req, res)=>{
    try {
        const addedBy = req.params.id;
        const {empId} = req.body;
        const blockedEmployee = await Employee.findByIdAndUpdate({_id:empId, addedBy:addedBy},{$set:{blocked:true}});
        if(!blockedEmployee){
            return res.status(404).json({
                message:"Employee is not found in Database!.",
                success:false
            })
        }
        return res.status(200).json({
            message:"Employee is blocked successfuly!",
            success:true
        })
        
    } catch (error) {
        return res.status(500).json({
            message:error.message || "Internal server error!, at the time of blocking of an employees .",
            success:false
        })       
    }
}

export const unBlockEmployee = async(req, res)=>{
    try {
        const addedBy = req.params.id;
        const {empId} = req.body;
        const unBlockedEmployee = await Employee.findByIdAndUpdate({_id:empId, addedBy:addedBy},{$set:{blocked:false}});
        if(!unBlockedEmployee){
            return res.status(404).json({
                message:"Employee is not found in Database!.",
                success:false
            })
        }
        return res.status(200).json({
            message:"Employee is unBlocked successfuly!",  
            success:true
        })
    } catch (error) {
        return res.status(500).json({
            message:error.message || "Internal erver error!, at the time of unBlocking of an employees .",
            success:false
        })       
    }
}





export const getEmployeeWorkStats = async (req, res) => {
  try {
    const { date, addedBy } = req.query;

    const targetDate = date ? new Date(date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const employees = await Employee.find({
      blocked: false,
      addedBy
    }).select('empName empEmail empDesignation target').lean();

    if (!employees.length) {
      return res.status(404).json({
        success: false,
        message: "No employees found",
      });
    }

    const employeeStats = [];
    let totalLeadsAdded = 0;
    let totalFollowups = 0;
    let totalUniqueLeadsInFollowups = 0;
    let totalPublicLeadsAccepted = 0;

    for (const employee of employees) {
      // Get leads with details
      const leadsAdded = await Lead.find({
        addedBy: employee._id,
        addedByType: "Employee",
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }).select('name phone email').lean();

      // Get followups with details
      const followupsDone = await Followup.find({
        followedBy: employee._id,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }).populate('leadId', 'name phone').lean();

      // Calculate unique leads in followups
      const uniqueLeadIds = new Set();
      followupsDone.forEach(followup => {
        if (followup.leadId && followup.leadId._id) {
          uniqueLeadIds.add(followup.leadId._id.toString());
        }
      });

      // Get public leads accepted by this employee today
      const publicLeadsAccepted = await Lead.countDocuments({
        publicLead: true,
        accepted: true,
        acceptedBy: employee._id,
        acceptedAt: { $gte: startOfDay, $lte: endOfDay }
      });

      const leadsCount = leadsAdded.length;
      const followupsCount = followupsDone.length;
      const uniqueLeadsCount = uniqueLeadIds.size;
      const totalWork = followupsCount;

      // Update totals
      totalLeadsAdded += leadsCount;
      totalFollowups += followupsCount;
      totalUniqueLeadsInFollowups += uniqueLeadsCount;
      totalPublicLeadsAccepted += publicLeadsAccepted;

      employeeStats.push({
        employee: {
          _id: employee._id,
          name: employee.empName,
          email: employee.empEmail,
          designation: employee.empDesignation,
          target: employee.target || 80
        },
        date: targetDate.toISOString().split("T")[0],
        publicLeadsAccepted: publicLeadsAccepted,
        leadsAdded: {
          count: leadsCount,
          details: leadsAdded.map(lead => ({
            _id: lead._id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email || 'N/A'
          }))
        },
        followupsDone: {
          count: followupsCount,
          uniqueLeads: uniqueLeadsCount,
          details: followupsDone.map(followup => ({
            leadId: {
              _id: followup.leadId?._id,
              name: followup.leadId?.name || 'N/A',
              phone: followup.leadId?.phone || 'N/A'
            },
            followupMessage: followup.followupMessage || 'No message',
            followupStatus: followup.followupStatus || { _id: null }
          }))
        },
        totalWork,
        achievement: employee.target ? ((totalWork / employee.target) * 100).toFixed(1) : '0',
        status: employee.target ? (totalWork >= employee.target ? "Achieved ✅" : "Pending ❌") : "No Target Set"
      });
    }

    // Sort by total work (descending)
    employeeStats.sort((a, b) => b.totalWork - a.totalWork);

    // Prepare the response with overall statistics
    const responseData = {
      overall: {
        totalEmployees: employees.length,
        totalLeadsAdded: totalLeadsAdded,
        totalFollowups: totalFollowups,
        totalUniqueLeadsInFollowups: totalUniqueLeadsInFollowups,
        totalPublicLeadsAccepted: totalPublicLeadsAccepted,
        averageWorkPerEmployee: employees.length > 0 ? 
          Math.round(totalFollowups / employees.length) : 0
      },
      employees: employeeStats
    };

    res.status(200).json({
      success: true,
      message: "Employee stats fetched successfully",
      data: responseData
    });

  } catch (error) {
    console.error('Error in getEmployeeWorkStats:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const saveFCMToken = async (req, res) => {
  try {
    const { employeeId, fcmToken } = req.body;
    console.log("🔑 Saving FCM token:", { employeeId, fcmToken: fcmToken?.substring(0, 20) + "..." });

    const updated = await Employee.findByIdAndUpdate(employeeId, {
      fcmToken
    }, { new: true });
    
    if (!updated) {
      console.log("❌ Employee not found for FCM token save");
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    
    console.log("✅ FCM token saved for:", updated.empName);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ FCM token save error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getEmployeeReport = async (req, res) => {
  try {
    const employeeId = new mongoose.Types.ObjectId(req.params.id);

    // Date range for today's followups
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Total assigned leads (including closed/negative, excluding deleted)
    const totalAssigned = await Lead.countDocuments({
      leadAssignedTo: employeeId,
      deleted: false
    });

    // 2. Closed leads (assigned to employee, closed: true, deleted: false)
    const closedLeads = await Lead.countDocuments({
      leadAssignedTo: employeeId,
      closed: true,
      deleted: false
    });

    // 3. Negative leads (assigned to employee, negative: true, deleted: false)
    const negativeLeads = await Lead.countDocuments({
      leadAssignedTo: employeeId,
      negative: true,
      deleted: false
    });

    // 4. Pending leads count (matching getPendingLeadsByEmployee logic)
    const pendingLeadsResult = await Lead.aggregate([
      {
        $match: {
          leadAssignedTo: employeeId,
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
                $ne: employeeId,
              },
            },
          ],
        },
      },
      { $count: "total" }
    ]);
    const pendingLeadsCount = pendingLeadsResult[0]?.total || 0;

    // 5. Leads added by employee
    const leadsAdded = await Lead.countDocuments({
      addedBy: employeeId,
      addedByType: "Employee",
      deleted: false
    });

    // 6. Today's followups
    const todaysFollowups = await Followup.countDocuments({
      followedBy: employeeId,
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    // 7. Total followups
    const totalFollowups = await Followup.countDocuments({
      followedBy: employeeId
    });

    // 7a. Today's reminders (using assignment time filter)
    const todayRemindersResult = await Followup.aggregate([
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
          nextFollowupDate: { $gte: todayStart, $lte: todayEnd }
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
          "lead.leadAssignedTo": employeeId
        }
      }
    ]);

    const todayReminders = todayRemindersResult.length;

    // 7b. Missed leads (using assignment time filter)
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
          nextFollowupDate: { $lt: todayStart }
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
          "lead.leadAssignedTo": employeeId
        }
      }
    ]);

    let missedLeads = 0;
    for (const item of missedLeadsResult) {
      const lead = item.lead;
      let assignedAt = null;
      if (lead.assignedAtMap) {
        assignedAt = lead.assignedAtMap[employeeId.toString()] || 
                     (lead.assignedAtMap instanceof Map ? lead.assignedAtMap.get(employeeId.toString()) : lead.assignedAtMap.get?.(employeeId.toString()));
      }
      if (!assignedAt) {
        assignedAt = lead.leadAssignedAt || lead.createdAt;
      }

      const hasFollowup = await Followup.exists({
        leadId: lead._id,
        followedBy: employeeId,
        _id: { $ne: item._id },
        createdAt: { $gt: new Date(assignedAt) }
      });

      if (!hasFollowup) {
        missedLeads++;
      }
    }

    // 8. Unique tag names for leads assigned to or added by employee
    const leadsForTags = await Lead.find({
      $or: [
        { leadAssignedTo: employeeId },
        { addedBy: employeeId, addedByType: "Employee" }
      ],
      deleted: false
    }).populate('tags').select('tags').lean();

    const tagNames = new Set();
    leadsForTags.forEach(lead => {
      if (lead.tags && Array.isArray(lead.tags)) {
        lead.tags.forEach(tag => {
          if (tag && tag.tagName) {
            tagNames.add(tag.tagName);
          }
        });
      }
    });
    const uniqueTagNames = Array.from(tagNames);

    return res.status(200).json({
      success: true,
      report: {
        totalAssigned,
        closedLeads,
        pendingLeads: pendingLeadsCount,
        negativeLeads,
        leadsAdded,
        todaysFollowups,
        totalFollowups,
        todayReminders,
        missedLeads,
        uniqueTagNames
      }
    });

  } catch (error) {
    console.error("Error in getEmployeeReport:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getPublicEmployeesBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const adminData = await Admin.findOne({ adminSlug: slug });
    if (!adminData) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    const employees = await Employee.find({
      addedBy: adminData._id,
      blocked: false
    }).select("empName empEmail empPhoneNumber _id");

    return res.status(200).json({
      success: true,
      employees
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching employees"
    });
  }
};

// Alternative optimized version with aggregation (faster for large datasets) dont in use
// export const getEmployeeWorkStatsOptimized = async (req, res) => {
//   try {
//     const { date } = req.query;
    
//     const targetDate = date ? new Date(date) : new Date();
//     const startOfDay = new Date(targetDate);
//     startOfDay.setHours(0, 0, 0, 0);
    
//     const endOfDay = new Date(targetDate);
//     endOfDay.setHours(23, 59, 59, 999);
    
//     // Get employee work stats using aggregation
//     const employeeStats = await Employee.aggregate([
//       { $match: { blocked: false } },
//       {
//         $lookup: {
//           from: "leads",
//           let: { employeeId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$addedBy", "$$employeeId"] },
//                     { $eq: ["$addedByType", "Employee"] },
//                     { $gte: ["$createdAt", startOfDay] },
//                     { $lte: ["$createdAt", endOfDay] }
//                   ]
//                 }
//               }
//             },
//             { $count: "count" }
//           ],
//           as: "leadsAdded"
//         }
//       },
//       {
//         $lookup: {
//           from: "followups",
//           let: { employeeId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$followedBy", "$$employeeId"] },
//                     { $gte: ["$createdAt", startOfDay] },
//                     { $lte: ["$createdAt", endOfDay] }
//                   ]
//                 }
//               }
//             },
//             { $count: "count" }
//           ],
//           as: "followupsDone"
//         }
//       },
//       {
//         $lookup: {
//           from: "followups",
//           let: { employeeId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$followedBy", "$$employeeId"] },
//                     { $gte: ["$createdAt", startOfDay] },
//                     { $lte: ["$createdAt", endOfDay] }
//                   ]
//                 }
//               }
//             },
//             { $group: { _id: "$leadId" } },
//             { $count: "count" }
//           ],
//           as: "uniqueLeadsFollowed"
//         }
//       },
//       {
//         $project: {
//           empName: 1,
//           empEmail: 1,
//           empDesignation: 1,
//           leadsAddedCount: { $arrayElemAt: ["$leadsAdded.count", 0] } || 0,
//           followupsDoneCount: { $arrayElemAt: ["$followupsDone.count", 0] } || 0,
//           uniqueLeadsFollowedCount: { $arrayElemAt: ["$uniqueLeadsFollowed.count", 0] } || 0,
//           totalWork: {
//             $add: [
//               { $arrayElemAt: ["$leadsAdded.count", 0] } || 0,
//               { $arrayElemAt: ["$followupsDone.count", 0] } || 0
//             ]
//           }
//         }
//       },
//       { $sort: { totalWork: -1 } }
//     ]);
    
//     // Calculate overall statistics
//     const overallStats = {
//       totalEmployees: employeeStats.length,
//       totalLeadsAdded: employeeStats.reduce((sum, stat) => sum + stat.leadsAddedCount, 0),
//       totalFollowups: employeeStats.reduce((sum, stat) => sum + stat.followupsDoneCount, 0),
//       totalUniqueLeadsInFollowups: employeeStats.reduce((sum, stat) => sum + stat.uniqueLeadsFollowedCount, 0),
//       date: targetDate.toISOString().split('T')[0]
//     };
    
//     res.status(200).json({
//       success: true,
//       message: "Employee work statistics retrieved successfully",
//       data: {
//         overall: overallStats,
//         employees: employeeStats
//       }
//     });
    
//   } catch (error) {
//     console.error("Error in getEmployeeWorkStatsOptimized:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message
//     });
//   }
// };