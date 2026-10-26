import mongoose from "mongoose";

const leadSchema = mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: "NA"
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  email: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
  },
  dob: {
    type: String,
  },
  // lead address
  sources: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeadSources"
  },
  services: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "services",
    default: null,
  },
  country: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  zipCode: {
    type: String,
    trim: true,
  },
  priority: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Priority"
  },
  // Lead Status
  leadStatus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeadStatus"

  },
  // Modified this field to be an array of ObjectIds
  leadAssignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  }],
  leadAssignedAt: {
    type: Date,
    default: null
  },
  assignedAtMap: {
    type: Map,
    of: Date,
    default: {}
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tag"
  }],
  deleted: {
    type: Boolean,
    required: true,
    default: false
  },
  closed: {
    type: Boolean,
    required: true,
    default: false
  },
  negative: {
    type: Boolean,
    required: true,
    default: false
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "addedByType",
    required: true,
  },
  addedByType: {
    type: String,
    required: true,
    enum: ["Admin", "Employee"],
  },
  // PUBLIC ENQUIRY SYSTEM

  publicLead: {
    type: Boolean,
    default: false
  },

  accepted: {
    type: Boolean,
    default: false
  },

  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },

  acceptedAt: {
    type: Date,
    default: null
  },

  adminOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    default: null
  },

  targetedEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },

  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "closedByType",
    default: null
  },
  closedByType: {
    type: String,
    enum: ["Admin", "Employee"],
    default: null
  },
  closedRemark: {
    type: String,
    default: ""
  },

  negativeBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "negativeByType",
    default: null
  },
  negativeByType: {
    type: String,
    enum: ["Admin", "Employee"],
    default: null
  },
  negativeRemark: {
    type: String,
    default: ""
  },
  closedAt: {
    type: Date,
    default: null
  },
  negativeAt: {
    type: Date,
    default: null
  },
}, { timestamps: true })

const Lead = new mongoose.model("Lead", leadSchema)
export default Lead;