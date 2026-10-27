import mongoose from "mongoose";

const followupSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead", 
      required: false,
    },
    excelLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExcelLead",
      required: false,
    },
  
    followupStatus: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:"LeadStatus"
    }],
    service:{
      type: mongoose.Schema.Types.ObjectId,
      ref:"services"
    },
    followedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required:true
    },
    followupMessage: {
      type: String,
      trim: true,
      required:true
    },
    nextFollowupDate: {   
      type: Date,
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    missedCounted: {
      type: Boolean,
      default: false
    },
    clientSpoken: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true,
  }
);

const Followup = new mongoose.model("Followup", followupSchema);

// Add compound index for fast latest followup lookup
followupSchema.index({ leadId: 1, createdAt: -1 });

export default Followup
