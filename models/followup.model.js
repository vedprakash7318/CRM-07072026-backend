import mongoose from "mongoose";

const followupSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead", 
      required: true,
    },
  
    followupStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref:"LeadStatus"
    },
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
  },
  {
    timestamps: true,
  }
);

const Followup = new mongoose.model("Followup", followupSchema);

export default Followup
