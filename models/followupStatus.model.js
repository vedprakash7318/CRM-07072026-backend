import mongoose from "mongoose";

const followupStatusSchema = mongoose.Schema({
    followupStatusText: {
        type: String,
        required: true,
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

const FollowupStatus = new mongoose.model("FollowupStatus", followupStatusSchema);
export default FollowupStatus; 