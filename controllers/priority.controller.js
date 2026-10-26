import mongoose from "mongoose";
import Priority from "../models/priority.model.js";
import Lead from "../models/lead.model.js";


export const addPriority = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const { priorityText, userType } = req.body;     
        if (!priorityText || !mongoose.Types.ObjectId.isValid(addedBy)) {
            return res.status(404).json({
                message: "PriorityText and addedBy are required !.",
                success: false
            })
        }
        
        // const isExistPriority = await Priority.findOne({priorityText:priorityText})
        // if(isExistPriority){
        //     return res.status(400).json({
        //         message:`Priority '${priorityText}' alrady exist!`,
        //         success:false
        //     })
        // }
        const newPriority = await Priority.create({
            priorityText: priorityText,
            addedBy,
            addedByType: userType === "Employee" ? "Empolyee" : "Admin"
        });
        return res.status(201).json({
            message: "Priority added successfully !",
            newPriority,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Adding Priority!.",
            success: false
        })
    }
}
export const getAllPriorities = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const priorities = await Priority.find({ addedBy: addedBy }).populate("addedBy").lean();
        if (!priorities) {
            return res.status(404).json({
                message: "Priority Not Found !.",
                success: false
            })
        }

        const withCount = await Promise.all(priorities.map(async (item) => {
            const count = await Lead.countDocuments({ priority: item._id });
            return { ...item, usageCount: count };
        }));

        return res.status(201).json({
            message: "These are the registered Priorities !",
            priorities: withCount,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of fetching all Priority!.",
            success: false
        })
    }
}
export const getPriorityById = async (req, res) => {
    try {
        const priorityId = req.params.id;
        if (!priorityId) {
            return res.status(404).json({
                message: "Priority Id Not Found !.",
                success: false
            })
        }
        const priority = await Priority.findOne({_id:priorityId});
        if (!priority) {
            return res.status(404).json({
                message: "Priority Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "This is the registered Priority !",
            priority,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of fetching single Priority!.",
            success: false
        })
    }
}
export const updatePriority = async (req, res) => {
    try {
        const priorityId = req.params.id;
        const { priorityText } = req.body;
        
        if (!priorityText) {
            return res.status(400).json({  // Changed from 404 to 400
                message: "PriorityText is required !.",
                success: false
            })
        }
        if (!priorityId) {
            return res.status(400).json({  // Changed from 404 to 400
                message: "PriorityId Not Found !.",
                success: false
            })
        }
        const priority = await Priority.findOne({_id:priorityId});
        if (!priority) {
            return res.status(404).json({
                message: "Priority Not Found !.",
                success: false
            })
        }

        // updating priority text
        priority.priorityText = priorityText;
        await priority.save();  // Added await keyword
        
        return res.status(200).json({  // Changed from 201 to 200
            message: "Priority Updated Successfully!",
            priority,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Updating Priority!.",
            success: false
        })
    }
}
export const deletePriority = async (req, res) => {
    try {
        const priorityId = req.params.id;
        if (!priorityId) {
            return res.status(404).json({
                message: "PriorityId Not Found !.",
                success: false
            })
        }
        const deletedPriority = await Priority.findByIdAndDelete(priorityId);
        if (!deletedPriority) {
            return res.status(404).json({
                message: "Priority Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "Lead status Deleted successfully !",
            deletedPriority,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Deletion of Priority!.",
            success: false
        })
    }
}

