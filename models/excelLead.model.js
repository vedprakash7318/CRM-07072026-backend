import mongoose from "mongoose";

const excelLeadSchema = mongoose.Schema({
  dynamicData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  sheetName: {
    type: String,
    required: true,
    default: "Sheet1"
  },
  adminOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  leadStatus: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeadStatus",
  }],
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "services",
    default: null
  },
  closed: {
    type: Boolean,
    default: false
  },
  negative: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  },
  closedRemark: {
    type: String,
    default: ""
  },
  negativeRemark: {
    type: String,
    default: ""
  }
}, { timestamps: true });

const ExcelLead = new mongoose.model("ExcelLead", excelLeadSchema);
export default ExcelLead;
