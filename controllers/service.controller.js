import mongoose from "mongoose";
import Services from "../models/service.model.js";


export const addservices = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const { servicesText, userType } = req.body;     
        if (!servicesText || !mongoose.Types.ObjectId.isValid(addedBy)) {
            return res.status(404).json({
                message: "servicesText and addedBy are required !.",
                success: false
            })
        }
        const newservices = await Services.create({
            servicesText: servicesText,
            addedBy,
            addedByType: userType === "Employee" ? "Empolyee" : "Admin"
        });
        return res.status(201).json({
            message: "services added successfully !",
            newservices,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Adding services!.",
            success: false
        })
    }
}
 
export const getAllServices = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const services = await Services.find({ addedBy: addedBy }).populate("addedBy");
        if (!services) {
            return res.status(404).json({
                message: "services Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "These are the registered Services !",
            services,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of fetching all services!.",
            success: false
        })
    }
}

export const getservicesById = async (req, res) => {
    try {
        const servicesId = req.params.id;
        if (!servicesId) {
            return res.status(404).json({
                message: "services Id Not Found !.",
                success: false
            })
        }
        const services = await Services.findOne({_id:servicesId});
        if (!services) {
            return res.status(404).json({
                message: "services Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "This is the registered services !",
            services,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of fetching single services!.",
            success: false
        })
    }
}

// export const updateservices = async (req, res) => {
//     try {
//         const servicesId = req.params.id;
//         const { servicesText } = req.body;
//         if (!servicesText) {
//             return res.status(404).json({
//                 message: "servicesText is required !.",
//                 success: false
//             })
//         }
//         if (!servicesId) {
//             return res.status(404).json({
//                 message: "servicesId Not Found !.",
//                 success: false
//             })
//         }
//         const services = await Services.findOne({_id:servicesId});
//         if (!services) {
//             return res.status(404).json({
//                 message: "services Not Found !.",
//                 success: false
//             })
//         }

//         // updating status
//         services.servicesText = servicesText;
//         services.save();
//         return res.status(201).json({
//             message: "Lead status Updated Successfully!",
//             services,
//             success: true
//         });

//     } catch (error) {
//         return res.status(500).json({
//             message: error.message || "Internal server Error at the time of Updating services!.",
//             success: false
//         })
//     }
// }

export const updateservices = async (req, res) => {
    try {
        const servicesId = req.params.id;
        const { servicesText } = req.body;
        
        if (!servicesText) {
            return res.status(400).json({  // Changed from 404 to 400
                message: "servicesText is required !.",
                success: false
            })
        }
        if (!servicesId) {
            return res.status(400).json({  // Changed from 404 to 400
                message: "servicesId Not Found !.",
                success: false
            })
        }
        const services = await Services.findOne({_id:servicesId});
        if (!services) {
            return res.status(404).json({
                message: "services Not Found !.",
                success: false
            })
        }

        // updating services text
        services.servicesText = servicesText;
        await services.save();  // Added await keyword
        
        return res.status(200).json({  // Changed from 201 to 200 (PUT update should be 200)
            message: "Services Updated Successfully!",
            services,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Updating services!.",
            success: false
        })
    }
}
export const deleteServices = async (req, res) => {
    try {
        const servicesId = req.params.id;
        if (!servicesId) {
            return res.status(404).json({
                message: "servicesId Not Found !.",
                success: false
            })
        }
        const deletedservices = await Services.findByIdAndDelete(servicesId);
        if (!deletedservices) {
            return res.status(404).json({
                message: "services Not Found !.",
                success: false
            })
        }

        return res.status(201).json({
            message: "Lead status Deleted successfully !",
            deletedservices,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server Error at the time of Deletion of services!.",
            success: false
        })
    }
}


export const getPublicServices = async (req, res) => {
  try {

    const services = await Services.find({})
      .populate("addedBy");

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      services
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while fetching services"
    });

  }
};