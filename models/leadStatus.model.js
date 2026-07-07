import mongoose from "mongoose";

const leadStatusSchema = mongoose.Schema({
    leadStatusText: {
        type: String,
        required: true,
    },  
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "addedByType", 
        required: true,
    },
    addedByType: {
        type: String,
        required: true,
        enum: ["Admin", "Employee"], // Specify allowed models
    },
}, { timestamps: true });

const LeadStatus = new mongoose.model("LeadStatus", leadStatusSchema);
export default LeadStatus; 