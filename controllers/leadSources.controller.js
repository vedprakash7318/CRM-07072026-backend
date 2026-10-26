import LeadSources from "../models/leadSources.model.js";
import Lead from "../models/lead.model.js";

export const addLeadSources = async (req, res) => {
    try {   
        const addedBy = req.params.id;
        const { SourcesText ,userType} = req.body;
        if (!SourcesText || !addedBy) {
            return res.status(404).json({
                message: "lead SourcesText  and addedBy are required !.",
                success: false
            })
        }
        const newLeadSources = await LeadSources.create({
            leadSourcesText: SourcesText,
            addedBy,
            addedByType: userType === "Employee" ? "Employee" : "Admin"
        });
        return res.status(201).json({
            message: "Lead Sources added successfully !",
            newLeadSources,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Adding leadSources!.",
            success: false
        })
    }
}
export const getAllLeadSources = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const leadSources = await LeadSources.find({ addedBy: addedBy }).populate("addedBy").lean();
        if (!leadSources) {
            return res.status(404).json({
                message: "leadSources Not Found !.",
                success: false
            })
        }

        const withCount = await Promise.all(leadSources.map(async (item) => {
            const count = await Lead.countDocuments({ sources: item._id });
            return { ...item, usageCount: count };
        }));

        return res.status(201).json({
            message: "These are the registered Lead Sources !",
            leadSources: withCount,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of fetching all leadSources!.",
            success: false
        })
    }
}
export const getLeadSourcesById = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const { leadSourcesId } = req.body;
        if (!addedBy || !addedBy) {
            return res.status(404).json({
                message: " leadSourcesId  and addedBy are required !.",
                success: false
            })
        }
        const leadSources = await LeadSources.findOne({ _id: leadSourcesId, addedBy: addedBy });
        if (!leadSources) {
            return res.status(404).json({
                message: "leadSources Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "This is the registered Lead Sources !",
            leadSources,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of fetching single leadSources!.",
            success: false
        })
    }
}
export const updateLeadSources = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const { SourcesText, leadSourcesId } = req.body;
        
        if (!SourcesText || !addedBy) {
            return res.status(400).json({  // Changed from 404 to 400
                message: "lead SourcesText and addedBy are required !.",
                success: false
            })
        }
        
        if (!leadSourcesId) {
            return res.status(400).json({
                message: "leadSourcesId is required !.",
                success: false
            })
        }
        
        const leadSources = await LeadSources.findOne({ _id: leadSourcesId, addedBy: addedBy });
        if (!leadSources) {
            return res.status(404).json({
                message: "leadSources Not Found !.",
                success: false
            })
        }

        // updating Sources
        leadSources.leadSourcesText = SourcesText;
        await leadSources.save();  // Added await keyword
        
        return res.status(200).json({  // Changed from 201 to 200
            message: "Lead Sources Updated Successfully!",
            leadSources,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Updating leadSources!.",
            success: false
        })
    }
}

export const deleteLeadSources = async (req, res) => {
    try {
        const  leadSourcesId  = req.params.id;
        console.log(leadSourcesId);  
        
        if (!leadSourcesId) {
            return res.status(404).json({
                message: " leadSourcesId are required !.",
                success: false
            })
        }
        const deletedLeadSources = await LeadSources.findByIdAndDelete(leadSourcesId);
        if (!deletedLeadSources) {
            return res.status(404).json({
                message: "leadSources Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "Lead Sources Deleted successfully !",
            deletedLeadSources,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Deletion of leadSources!.",
            success: false
        })
    }
}