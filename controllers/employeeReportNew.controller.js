import EmployeeReportNew from "../models/employeeReportNew.model.js";
import Employee from "../models/employee.model.js";
import mongoose from "mongoose";

export const getDailyReports = async (req, res) => {
  try {
    let { adminId, startDate, endDate, empId } = req.query;

    if (!adminId) {
      return res.status(400).json({ success: false, message: "Admin ID is required" });
    }

    let start = new Date();
    start.setHours(0, 0, 0, 0);
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    const matchStage = {
      adminId: new mongoose.Types.ObjectId(adminId),
      reportDate: { $gte: start, $lte: end }
    };

    if (empId && empId !== "All" && empId !== "undefined" && empId !== "null") {
      matchStage.employeeId = new mongoose.Types.ObjectId(empId);
    }

    // 1. Fetch all employees for this admin (or specific employee)
    const empMatch = { addedBy: adminId, blocked: false };
    if (matchStage.employeeId) {
      empMatch._id = matchStage.employeeId;
    }
    const employees = await Employee.find(empMatch).select('empName empProfile');

    // 2. Aggregate reports for the date range
    const aggregatedReports = await EmployeeReportNew.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$employeeId",
          followups: { $sum: "$followups" },
          reminders: { $sum: "$reminders" },
          missedLeads: { $sum: "$missedLeads" },
          closedLeads: { $sum: "$closedLeads" },
          negativeLeads: { $sum: "$negativeLeads" }
        }
      }
    ]);

    const reportMap = {};
    aggregatedReports.forEach(r => {
      reportMap[r._id.toString()] = r;
    });

    // 3. Format Date string for display
    const formatOpts = { day: '2-digit', month: '2-digit', year: '2-digit' };
    const startStr = start.toLocaleDateString('en-GB', formatOpts);
    let displayDate = startStr;
    if (startDate && endDate && start.toDateString() !== end.toDateString()) {
      const endStr = end.toLocaleDateString('en-GB', formatOpts);
      displayDate = `${startStr} - ${endStr}`;
    }

    // 4. Map data ensuring all employees have a row
    const finalReports = employees.map(emp => {
      const data = reportMap[emp._id.toString()] || {};
      return {
        employeeId: { _id: emp._id, empName: emp.empName, empProfile: emp.empProfile },
        empName: emp.empName,
        displayDate,
        followups: data.followups || 0,
        reminders: data.reminders || 0,
        missedLeads: data.missedLeads || 0,
        closedLeads: data.closedLeads || 0,
        negativeLeads: data.negativeLeads || 0
      };
    });

    finalReports.sort((a, b) => a.empName.localeCompare(b.empName));

    return res.status(200).json({
      success: true,
      data: finalReports,
    });
  } catch (error) {
    console.error("Error in getDailyReports:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
