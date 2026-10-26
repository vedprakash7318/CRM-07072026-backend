import mongoose from "mongoose";

const employeeReportNewSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  reportDate: {
    type: Date,
    required: true,
  },
  missedLeads: {
    type: Number,
    default: 0,
  },
  reminders: {
    type: Number,
    default: 0,
  },
  followups: {
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
}, { timestamps: true });

// Ensure one report per employee per day
employeeReportNewSchema.index({ employeeId: 1, reportDate: 1 }, { unique: true });

const EmployeeReportNew = mongoose.model("EmployeeReportNew", employeeReportNewSchema);
export default EmployeeReportNew;
