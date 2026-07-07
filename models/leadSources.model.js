import mongoose from "mongoose";

const leadSourcesSchema = mongoose.Schema({
    leadSourcesText: {
        type: String,
        required: true,
        unique: true,
        trim: true
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
}, { timestamps: true });

const LeadSources = new mongoose.model("LeadSources", leadSourcesSchema);
export default LeadSources; 