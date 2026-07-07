import mongoose from "mongoose";

const employeeDailyReportSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    assignedLeads: {
      type: Number,
      default: 0,
    },
    pendingLeads: {
      type: Number,
      default: 0,
    },
    reminders: {
      type: Number,
      default: 0,
    },
    negativeLeads: {
      type: Number,
      default: 0,
    },
    closedLeads: {
      type: Number,
      default: 0,
    },
    missedLeads: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

const EmployeeDailyReport = mongoose.model("EmployeeDailyReport", employeeDailyReportSchema);

export default EmployeeDailyReport;
