import mongoose from "mongoose";

const tagLeadRequestSchema = mongoose.Schema({
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tag",
    required: true,
  }],
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  adminId: {   // ✅ NEW FIELD
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  },
    rejectionReason: {   // ✅ NEW FIELD
    type: String,
    default: null,     // optional
    trim: true
  }
}, { timestamps: true });

export default mongoose.model("TagLeadRequest", tagLeadRequestSchema);
