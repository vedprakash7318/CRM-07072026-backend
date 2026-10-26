import ExcelLead from "../models/excelLead.model.js";
import InAppNotification from "../models/notification.model.js";
import xlsx from "xlsx";

export const uploadExcelLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const adminId = req.user?.id || req.user?._id; 
    if (!adminId) {
       return res.status(401).json({ success: false, message: "Unauthorized admin" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const excelSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[excelSheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: "Empty excel file" });
    }

    const finalSheetName = req.body.sheetName || excelSheetName;

    const formattedLeads = data.map((row) => ({
      dynamicData: row,
      adminOwner: adminId,
      sheetName: finalSheetName
    }));

    await ExcelLead.insertMany(formattedLeads);

    return res.status(200).json({ 
      success: true, 
      message: `${formattedLeads.length} leads uploaded successfully` 
    });

  } catch (error) {
    console.error("Error uploading excel leads:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAdminExcelSheets = async (req, res) => {
  try {
    const sheets = await ExcelLead.distinct("sheetName", { deleted: false });
    return res.status(200).json({ success: true, sheets: sheets.filter(Boolean) });
  } catch (error) {
    console.error("Error fetching excel sheets:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAdminExcelLeads = async (req, res) => {
  try {
    const { sheetName, page = 1, limit = 10, search = '' } = req.query;

    let query = { deleted: false };
    
    if (sheetName) {
      query.sheetName = sheetName;
    }

    if (search) {
      // Dynamic search across any dynamicData key using $regex
      // We can't know the exact keys, but MongoDB allows searching subdocuments if we know keys,
      // However, we don't know the keys. 
      // To search values within dynamicData dynamically, we can use an aggregation pipeline, 
      // OR we can fetch a sample document to get keys and then construct the query.
      // Let's get sample keys for this sheet first.
      const sample = await ExcelLead.findOne({ sheetName, deleted: false });
      if (sample && sample.dynamicData) {
        const keys = Object.keys(sample.dynamicData);
        const orConditions = keys.map(key => ({
          [`dynamicData.${key}`]: { $regex: search, $options: 'i' }
        }));
        
        if (orConditions.length > 0) {
          query.$or = orConditions;
        }
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const leads = await ExcelLead.find(query)
       .populate("assignedTo", "name empName email")
       .sort({ createdAt: -1 })
       .skip(skip)
       .limit(Number(limit));

    const totalLeads = await ExcelLead.countDocuments(query);

    return res.status(200).json({ 
      success: true, 
      leads,
      totalLeads,
      totalPages: Math.ceil(totalLeads / Number(limit)),
      currentPage: Number(page)
    });
  } catch (error) {
    console.error("Error fetching excel leads:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const assignExcelLeads = async (req, res) => {
  try {
    const { leadIds, employeeId } = req.body;

    if (!leadIds || !employeeId) {
      return res.status(400).json({ success: false, message: "leadIds and employeeId are required" });
    }

    await ExcelLead.updateMany(
      { _id: { $in: leadIds } },
      { 
        $set: { 
          assignedTo: employeeId,
          assignedAt: new Date()
        } 
      }
    );

    await InAppNotification.create({
      employeeId,
      title: "New Excel Leads Assigned",
      body: `You have been assigned ${leadIds.length} new excel leads.`,
      type: "SYSTEM",
      url: "/myExcelLeads"
    });

    return res.status(200).json({ success: true, message: "Leads assigned successfully" });

  } catch (error) {
    console.error("Error assigning excel leads:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const unassignExcelLeads = async (req, res) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || leadIds.length === 0) {
      return res.status(400).json({ success: false, message: "leadIds are required" });
    }

    await ExcelLead.updateMany(
      { _id: { $in: leadIds } },
      { 
        $unset: { 
          assignedTo: 1,
          assignedAt: 1
        } 
      }
    );

    return res.status(200).json({ success: true, message: "Leads unassigned successfully" });

  } catch (error) {
    console.error("Error unassigning excel leads:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getEmployeeExcelSheets = async (req, res) => {
  try {
    const employeeId = req.user?.id || req.user?._id; 
    if (!employeeId) {
       return res.status(401).json({ success: false, message: "Unauthorized employee" });
    }
    const sheets = await ExcelLead.distinct("sheetName", { assignedTo: employeeId, deleted: false });
    return res.status(200).json({ success: true, sheets: sheets.filter(Boolean) });
  } catch (error) {
    console.error("Error fetching employee excel sheets:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getEmployeeExcelLeads = async (req, res) => {
  try {
    const employeeId = req.user?.id || req.user?._id; 
    if (!employeeId) {
       return res.status(401).json({ success: false, message: "Unauthorized employee" });
    }

    const { sheetName, page = 1, limit = 10, search = "" } = req.query;

    const query = { assignedTo: employeeId, deleted: false };
    if (sheetName) {
      query.sheetName = sheetName;
    }

    if (search) {
      const sample = await ExcelLead.findOne({ assignedTo: employeeId, deleted: false });
      if (sample && sample.dynamicData) {
        const keys = Object.keys(sample.dynamicData);
        const orConditions = keys.map(key => ({
          [`dynamicData.${key}`]: { $regex: search, $options: 'i' }
        }));
        
        if (orConditions.length > 0) {
          query.$or = orConditions;
        }
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const leads = await ExcelLead.find(query)
       .populate("leadStatus")
       .sort({ assignedAt: -1 })
       .skip(skip)
       .limit(Number(limit));

    const totalLeads = await ExcelLead.countDocuments(query);

    return res.status(200).json({ 
      success: true, 
      leads,
      totalLeads,
      totalPages: Math.ceil(totalLeads / Number(limit)),
      currentPage: Number(page)
    });

  } catch (error) {
    console.error("Error fetching employee excel leads:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateExcelLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { dynamicData } = req.body;

    if (!dynamicData) {
      return res.status(400).json({ success: false, message: "dynamicData is required" });
    }

    const updatedLead = await ExcelLead.findByIdAndUpdate(
      id,
      { $set: { dynamicData } },
      { new: true }
    );

    if (!updatedLead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Lead updated successfully",
      lead: updatedLead
    });

  } catch (error) {
    console.error("Error updating excel lead:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
