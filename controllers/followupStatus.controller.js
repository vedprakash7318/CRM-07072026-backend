import Employee from "../models/employee.model.js";
import FollowupStatus from "../models/followupStatus.model.js";
export const addFollowupStatus = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const { statusText, userType } = req.body;
        if (!statusText, userType) {
            return res.status(404).json({
                message: "FollowupStatusText and userType is required !.",
                success: false
            })
        }
        let isExistAddedBy = await Employee.findOne({ _id: addedBy });
        if (!isExistAddedBy) {
            return res.status(400).json({
                message: "Invalid addedBy Id !",
                success: false,
            })
        }

        const newFollowupStatus = await FollowupStatus.create({
            followupStatusText: statusText,
            addedBy,
            addedByType:userType==="Employee" ? "Employee" : "Admin"
        });
        return res.status(201).json({
            message: "Followup status added successfully !",
            newFollowupStatus,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Adding FollowupStatus!.",
            success: false
        })
    }
}
export const getAllFollowupStatus = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const followupStatus = await FollowupStatus.find({addedBy:addedBy}).populate("addedBy");
        if (!followupStatus) {
            return res.status(404).json({
                message: "FollowupStatus Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "These are the registered Followup status !",
            followupStatus,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of fetching all FollowupStatus!.",
            success: false
        })
    }
}
export const getFollowupStatusById = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const {followupStatusId} = req.body;
        if (!followupStatusId) {
            return res.status(404).json({
                message: "followupStatusId Not Found !.",
                success: false
            })
        }
        const followupStatus = await FollowupStatus.findOne({_id:followupStatusId, addedBy:addedBy}).populate("addedBy");
        if (!followupStatus) {
            return res.status(404).json({
                message: "FollowupStatus Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "This is the registered Followup status !",
            followupStatus,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of fetching single FollowupStatus!.",
            success: false
        })
    }
}
export const updateFollowupStatus = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const { statusText, followupStatusId } = req.body;
        if (!statusText) {
            return res.status(404).json({
                message: "FollowupStatusText is required !.",
                success: false
            })
        }
        if (!followupStatusId) {
            return res.status(404).json({
                message: "FollowupStatusId Not Found !.",
                success: false
            })
        }
        const followupStatus = await FollowupStatus.findOne({_id:followupStatusId, addedBy:addedBy});
        if (!followupStatus) {
            return res.status(404).json({
                message: "FollowupStatus Not Found !.",
                success: false
            })
        }

        // updating status
        followupStatus.followupStatusText = statusText;
        followupStatus.save();
        return res.status(201).json({
            message: "Followup status Updated Successfully!",
            followupStatus,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Updating FollowupStatus!.",
            success: false
        })
    }
}

export const deleteFollowupStatus = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const {followupStatusId} = req.body;
        if (!mongoose.Types.ObjectId.isValid(followupStatusId)) {
            return res.status(400).json({
                message: "Invalid FollowupStatusId.",
                success: false,
            });
        }
        const deletedFollowupStatus = await FollowupStatus.findByIdAndDelete({_id:followupStatusId, addedBy:addedBy});
        if (!deletedFollowupStatus) {
            return res.status(404).json({
                message: "FollowupStatus Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "Followup status Deleted successfully !",
            deletedFollowupStatus,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Deletion of FollowupStatus!.",
            success: false
        })
    }
}