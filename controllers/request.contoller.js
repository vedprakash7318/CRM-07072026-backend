import TagLeadRequest from "../models/request.model.js";
import Lead from "../models/lead.model.js";
import Employee from "../models/employee.model.js";
import mongoose from "mongoose";
import admin from "../Firebase/firebaseAdmin.js";

export const checkTagAssignment = async (req, res) => {
  try {
    const { tags, employeeId } = req.body;

    if (!tags?.length || !employeeId) {
      return res.status(400).json({ message: "tags & employeeId required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const leads = await Lead.find({
      addedBy: employee.addedBy,
      tags: { $all: tags },
      leadAssignedTo: { $ne: null, $exists: true, $not: { $size: 0 } }
    }).populate("leadAssignedTo");

    let assignedEmployees = new Set();
    
    leads.forEach(lead => {
      if (lead.leadAssignedTo && lead.leadAssignedTo.length > 0) {
        lead.leadAssignedTo.forEach(emp => {
          if (emp._id.toString() !== employeeId.toString()) {
            assignedEmployees.add(emp.empName);
          }
        });
      }
    });

    const assignedEmployeesArr = Array.from(assignedEmployees);

    res.json({
      success: true,
      isAssigned: assignedEmployeesArr.length > 0,
      assignedEmployees: assignedEmployeesArr
    });
  } catch (error) {
    console.log("Error in checkTagAssignment:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const requestByTags = async (req, res) => {
  try {
    const { tags, employeeId } = req.body;

    if (!tags?.length || !employeeId) {
      return res.status(400).json({ message: "tags & employeeId required" });
    }

    // ✅ Get employee's admin
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const request = await TagLeadRequest.create({
      tags,
      employeeId,
      adminId: employee.addedBy, // ✅ IMPORTANT
      status: "pending"
    });

    res.json({
      success: true,
      message: "Request created successfully",
      request
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


//get Tag Request
export const getTagRequests = async (req, res) => {
  try {
    const { addedby } = req.params;

    const requests = await TagLeadRequest.find({ status: "pending",adminId:addedby })
      .populate("tags")
      .populate("employeeId");

    let response = [];

    for (const reqObj of requests) {
      // ✅ Full tag match using $all
      const leads = await Lead.find({
        addedBy: addedby,
        tags: { $all: reqObj.tags.map(t => t._id) }
      })
        .populate("tags")
        .populate("priority")
        .populate("sources")
        .populate("leadAssignedTo");

      response.push({
        requestId: reqObj._id,
        employee: reqObj.employeeId,
        tags: reqObj.tags,
        leads
      });
    }

    res.json({
      success: true,
      count: response.length,
      requests: response
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


//accesptTagRequest
export const acceptTagRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "requestId is required" });
    }

    const request = await TagLeadRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const { tags, employeeId } = request;

    const leadsToAssign = await Lead.find({ tags: { $all: tags } });
    
    const notificationsToSend = {
      removed: {} // empId -> count
    };

    let assignedCount = 0;

    for (const lead of leadsToAssign) {
      const previousAssignees = (lead.leadAssignedTo || []).map(id => id.toString());
      const newAssigneeStr = employeeId.toString();

      if (!previousAssignees.includes(newAssigneeStr)) {
        assignedCount++;
      }

      const removedAssignees = previousAssignees.filter(id => id !== newAssigneeStr);
      removedAssignees.forEach(empIdStr => {
        notificationsToSend.removed[empIdStr] = (notificationsToSend.removed[empIdStr] || 0) + 1;
      });

      const currentMap = lead.assignedAtMap || new Map();
      currentMap.set(employeeId.toString(), new Date());
      lead.leadAssignedTo = [employeeId];
      lead.assignedAtMap = currentMap;
      lead.leadAssignedAt = new Date();
      await lead.save();
    }

    request.status = "accepted";
    await request.save();

    /* ===============================
       🔔 SEND NOTIFICATION (NON-BLOCKING)
    =============================== */
    try {
      const employee = await Employee.findById(employeeId);
      if (employee?.fcmTokens && employee.fcmTokens.length > 0) {
        await admin.messaging().sendEachForMulticast({ tokens: employee.fcmTokens,
          notification: {
            title: "✅ Request Approved",
            body: `Your tag request has been accepted. ${assignedCount} leads assigned.`,
          },
          data: { url: "/leads", type: "REQUEST_APPROVED" },
          webpush: {
            notification: {
              title: "✅ Request Approved",
              body: `Your tag request has been accepted. ${assignedCount} leads assigned.`,
              icon: "/favicon.ico",
              sound: "default",
              requireInteraction: true,
            },
            fcmOptions: { link: "/leads" }
          }
        });
      }

      // Notify removed employees
      for (const [empIdStr, count] of Object.entries(notificationsToSend.removed)) {
        const removedEmp = await Employee.findById(empIdStr);
        if (removedEmp?.fcmTokens && removedEmp.fcmTokens.length > 0) {
          await admin.messaging().sendEachForMulticast({ tokens: removedEmp.fcmTokens,
            notification: {
              title: "🔔 Lead Unassigned",
              body: `${count} lead(s) have been reassigned due to a tag request.`,
            },
            data: { url: "/main", type: "LEAD_UNASSIGNED" },
            webpush: {
              notification: {
                title: "🔔 Lead Unassigned",
                body: `${count} lead(s) have been reassigned due to a tag request.`,
                icon: "/favicon.ico",
                sound: "default",
                requireInteraction: true,
              },
              fcmOptions: { link: "/main" }
            }
          });
        }
      }
      
    } catch (notifyError) {
      console.log("Accept notify error:", notifyError.message);
      
    }

    res.json({
      success: true,
      message: "Leads assigned successfully",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//reject Tag request
export const rejectTagRequest = async (req, res) => {
  try {
    const { requestId, rejectionReason } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "requestId is required" });
    }

    const request = await TagLeadRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "rejected";

    if (rejectionReason) {
      request.rejectionReason = rejectionReason;
    }

    await request.save();

    /* ===============================
       🔔 SEND NOTIFICATION (NON-BLOCKING)
    =============================== */
    try {
      const employee = await Employee.findById(request.employeeId);

      if (employee?.fcmTokens && employee.fcmTokens.length > 0) {
        await admin.messaging().sendEachForMulticast({ tokens: employee.fcmTokens,
          notification: {
            title: "❌ Request Rejected",
            body:
              rejectionReason ||
              "Your tag request has been rejected by admin.",
          },
          webpush: {
            notification: {
              title: "❌ Request Rejected",
              body:
                rejectionReason ||
                "Your tag request has been rejected by admin.",
              icon: "/favicon.ico",
              sound: "default",
              requireInteraction: true,
            }
          }
          
        });
        
      }
    } catch (notifyError) {
      console.log("Reject notify error:", notifyError.message);
    }

    res.json({
      success: true,
      message: "Request rejected successfully",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getAllRequestsByAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    let {
      page = 1,
      limit = 10,
      search = "",
      status
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const matchStage = {
      adminId: new mongoose.Types.ObjectId(adminId)
    };

    if (status) {
      matchStage.status = status;
    }

    // 🔍 SEARCH CONDITIONS
    const searchRegex = new RegExp(search, "i");

    const pipeline = [
      { $match: matchStage },

      // JOIN EMPLOYEE
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee"
        }
      },
      { $unwind: "$employee" },

      // JOIN TAGS
      {
        $lookup: {
          from: "tags",
          localField: "tags",
          foreignField: "_id",
          as: "tags"
        }
      },

      // 🔍 SEARCH FILTER
      {
        $match: {
          $or: [
            { "employee.empName": { $regex: searchRegex } },
            { "tags.tagName": { $regex: searchRegex } },
            { status: { $regex: searchRegex } }
          ]
        }
      },

      // SORT LATEST FIRST
      { $sort: { createdAt: -1 } },

      // PAGINATION
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await TagLeadRequest.aggregate(pipeline);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    // ✅ OPTIONAL: attach leads (only when needed)
    const finalData = await Promise.all(
      data.map(async (reqObj) => {
        const leads = await Lead.find({
          addedBy: adminId,
          tags: { $all: reqObj.tags.map(t => t._id) }
        }).select("name phone");

        return {
          ...reqObj,
          leads
        };
      })
    );

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: finalData
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};




export const getRequestsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    let { page = 1, limit = 10, search = "", status } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const matchStage = {
      employeeId: new mongoose.Types.ObjectId(employeeId)
    };

    if (status) {
      matchStage.status = status;
    }

    const searchRegex = new RegExp(search, "i");

    const pipeline = [
      { $match: matchStage },

      // JOIN TAGS
      {
        $lookup: {
          from: "tags",
          localField: "tags",
          foreignField: "_id",
          as: "tags"
        }
      },

      // 🔍 SEARCH
      {
        $match: {
          $or: [
            { "tags.tagName": { $regex: searchRegex } },
            { status: { $regex: searchRegex } }
          ]
        }
      },

      { $sort: { createdAt: -1 } },

      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          totalCount: [{ $count: "count" }]
        }
      }
    ];

    const result = await TagLeadRequest.aggregate(pipeline);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};