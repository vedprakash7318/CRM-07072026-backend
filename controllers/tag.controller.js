// import mongoose from "mongoose";
// import Tag from "../models/tag.modal.js";


// export const addTag = async (req, res) => {
//     try {
//         const addedBy = req.params.id;
//         // console.log(addedBy);
        
//         const { tagName, userType } = req.body;     
//         // console.log(tagName);
           
//         if (!tagName || !mongoose.Types.ObjectId.isValid(addedBy)) {
//             return res.status(404).json({
//                 message: "TagName and addedBy are required !.",
//                 success: false
//             })
//         }
        
//         const isExistTag = await Tag.findOne({tagName:tagName})
//         if(isExistTag){
//             return res.status(400).json({
//                 message:Tag `${tagName}' alrady exist!`,
//                 success:false
//             })
//         }
//         const newTag = await Tag.create({
//             tagName: tagName,
//             addedBy,
//             addedByType: userType === "Employee" ? "Empolyee" : "Admin"
//         });
//         return res.status(201).json({
//             message: "Tag added successfully !",
//             newTag,
//             success: true
//         });

//     } catch (error) {
//         return res.status(500).json({
//             message: error.message || "Internal server Error at the time of Adding Tag!.",
//             success: false
//         })
//     }
// }
// export const getAllTags = async (req, res) => {
//     try {
//         const addedBy = req.params.id;
//         const tags = await Tag.find({ addedBy: addedBy }).populate("addedBy");
//         if (!tags) {
//             return res.status(404).json({
//                 message: "Tag Not Found !.",
//                 success: false
//             })
//         }

//         return res.status(201).json({
//             message: "These are the registered Tags !",
//             tags,
//             success: true
//         });

//     } catch (error) {
//         return res.status(500).json({
//             message: error.message || "Internal server Error at the time of fetching all Tag!.",
//             success: false
//         })
//     }
// }



// // export const getAllTags = async (req, res) => {
// //     try {
// //         const addedBy = req.params.id;
// //         const { page = 1, limit = 20, search = '' } = req.query;
        
// //         const query = { 
// //             addedBy: addedBy,
// //             ...(search && { tagName: { $regex: search, $options: 'i' } })
// //         };

// //         const options = {
// //             page: parseInt(page),
// //             limit: parseInt(limit),
// //             populate: "addedBy",
// //             sort: { createdAt: -1 }
// //         };

// //         const result = await Tag.paginate(query, options);
        
// //         if (!result.docs || result.docs.length === 0) {
// //             return res.status(404).json({
// //                 message: "No tags found!",
// //                 success: false
// //             });
// //         }

// //         return res.status(200).json({
// //             message: "Tags retrieved successfully",
// //             tags: result.docs,
// //             totalCount: result.totalDocs,
// //             success: true
// //         });

// //     } catch (error) {
// //         return res.status(500).json({
// //             message: error.message || "Internal server Error",
// //             success: false
// //         });
// //     }
// // };

// export const getTagById = async (req, res) => {
//     try {
//         const tagId = req.params.id;
//         if (!tagId) {
//             return res.status(404).json({
//                 message: "Tag Id Not Found !.",
//                 success: false
//             })
//         }
//         const tag = await Tag.findOne({_id:tagId});
//         if (!tag) {
//             return res.status(404).json({
//                 message: "Tag Not Found !.",
//                 success: false
//             })
//         }

//         return res.status(201).json({
//             message: "This is the registered Tag !",
//             tag,
//             success: true
//         });

//     } catch (error) {
//         return res.status(500).json({
//             message: error.message || "Internal server Error at the time of fetching single Tag!.",
//             success: false
//         })
//     }
// }
// export const updateTag = async (req, res) => {
//     try {
//         const tagId = req.params.id;
//         const { tagName } = req.body;
//         if (!tagName) {
//             return res.status(404).json({
//                 message: "TagName is required !.",
//                 success: false
//             })
//         }
//         if (!tagId) {
//             return res.status(404).json({
//                 message: "TagId Not Found !.",
//                 success: false
//             })
//         }
//         const tag = await Tag.findOne({_id:tagId});
//         if (!tag) {
//             return res.status(404).json({
//                 message: "Tag Not Found !.",
//                 success: false
//             })
//         }

//         // updating status
//         tag.tagName = tagName;
//         tag.save();
//         return res.status(201).json({
//             message: "Lead status Updated Successfully!",
//             tag,
//             success: true
//         });

//     } catch (error) {
//         return res.status(500).json({
//             message: error.message || "Internal server Error at the time of Updating Tag!.",
//             success: false
//         })
//     }
// }

// export const deleteTag = async (req, res) => {
//     try {
//         const tagId = req.params.id;
//         if (!tagId) {
//             return res.status(404).json({
//                 message: "TagId Not Found !.",
//                 success: false
//             })
//         }
//         const deletedTag = await Tag.findByIdAndDelete(tagId);
//         if (!deletedTag) {
//             return res.status(404).json({
//                 message: "Tag Not Found !.",
//                 success: false
//             })
//         }

//         return res.status(201).json({
//             message: "Lead status Deleted successfully !",
//             deletedTag,
//             success: true
//         });

//     } catch (error) {
//         return res.status(500).json({
//             message: error.message || "Internal server Error at the time of Deletion of Tag!.",
//             success: false
//         })
//     }
// }



import mongoose from "mongoose";
import Tag from "../models/tag.modal.js";
import TagParent from "../models/tagParent.model.js";

// ============================
// ✅ ADD TAG (WITH PARENT)
// ============================
export const addTag = async (req, res) => {
    try {
        const addedBy = req.params.id;
        const { tagName, userType, parentId } = req.body;

        // Validation
        if (!tagName || !mongoose.Types.ObjectId.isValid(addedBy)) {
            return res.status(400).json({
                message: "TagName and valid addedBy are required!",
                success: false
            });
        }

        // Validate parentId
        let validParentId = null;
        if (parentId) {
            if (!mongoose.Types.ObjectId.isValid(parentId)) {
                return res.status(400).json({
                    message: "Invalid parentId!",
                    success: false
                });
            }

            const parentExists = await TagParent.findById(parentId);
            if (!parentExists) {
                return res.status(404).json({
                    message: "Parent tag not found!",
                    success: false
                });
            }

            validParentId = parentId;
        }

        // Duplicate check (same name under same parent)
        const isExistTag = await Tag.findOne({
            tagName,
            parentId: validParentId
        });

        if (isExistTag) {
            return res.status(400).json({
                message: `Tag '${tagName}' already exists under this parent!`,
                success: false  
            });
        }

        // Create
        const newTag = await Tag.create({
            tagName,
            parentId: validParentId,
            addedBy,
            addedByType: userType === "Employee" ? "Employee" : "Admin"
        });

        return res.status(201).json({
            message: "Tag added successfully!",
            newTag,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Error while adding tag",
            success: false
        });
    }
};


// ============================
// ✅ GET ALL TAGS (WITH PARENT)
// ============================
// Update your getAllTags function in the backend
export const getAllTagsServerSidePagination = async (req, res) => {
    try {
        const addedBy = req.params.id;

        // 📌 Query params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";

        const skip = (page - 1) * limit;

        // 🔍 Search filter
        const searchFilter = {
            addedBy,
            ...(search && { tagName: { $regex: search, $options: "i" } })
        };

        // 📊 Data + count
        const [tags, total] = await Promise.all([
            Tag.find(searchFilter)
                .populate("parentId", "tagParentName")
                .populate("addedBy")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),

            Tag.countDocuments(searchFilter)
        ]);

        return res.status(200).json({
            message: "Tags fetched successfully",
            success: true,
            tags,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
            success: false
        });
    }
};



export const getAllTags = async (req, res) => {
    try {
        const addedBy = req.params.id;

        const tags = await Tag.find({ addedBy })
            .populate("parentId", "tagParentName")
            .populate("addedBy");

        return res.status(200).json({
            message: "Tags fetched successfully",
            tags,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
            success: false
        });
    }
};


// ============================
// ✅ GET SINGLE TAG
// ============================
export const getTagById = async (req, res) => {
    try {
        const tagId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(tagId)) {
            return res.status(400).json({
                message: "Invalid Tag ID!",
                success: false
            });
        }

        const tag = await Tag.findById(tagId)
            .populate("parentId", "tagName");

        if (!tag) {
            return res.status(404).json({
                message: "Tag not found!",
                success: false
            });
        }

        return res.status(200).json({
            message: "Tag fetched successfully",
            tag,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
            success: false
        });
    }
};


// ============================
// ✅ UPDATE TAG (NAME + PARENT)
// ============================
export const updateTag = async (req, res) => {
    try {
        const tagId = req.params.id;
        const { tagName, parentId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(tagId)) {
            return res.status(400).json({
                message: "Invalid TagId!",
                success: false
            });
        }

        const tag = await Tag.findById(tagId);
        if (!tag) {
            return res.status(404).json({
                message: "Tag not found!",
                success: false
            });
        }

        // Validate parentId
        let validParentId = tag.parentId;

        if (parentId !== undefined) {
            if (parentId === null || parentId === "") {
                validParentId = null;
            } else {
                if (!mongoose.Types.ObjectId.isValid(parentId)) {
                    return res.status(400).json({
                        message: "Invalid parentId!",
                        success: false
                    });
                }

                const parentExists = await TagParent.findById(parentId);
                if (!parentExists) {
                    return res.status(404).json({
                        message: "Parent tag not found!",
                        success: false
                    });
                }

                validParentId = parentId;
            }
        }

        // Duplicate check
        if (tagName) {
            const existingTag = await Tag.findOne({
                tagName,
                parentId: validParentId,
                _id: { $ne: tagId }
            });

            if (existingTag) {
                return res.status(400).json({
                    message: `Tag '${tagName}' already exists under this parent!`,
                    success: false
                });
            }

            tag.tagName = tagName;
        }

        tag.parentId = validParentId;

        await tag.save();

        return res.status(200).json({
            message: "Tag updated successfully!",
            tag,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
            success: false
        });
    }
};


// ============================
// ✅ DELETE TAG
// ============================
export const deleteTag = async (req, res) => {
    try {
        const tagId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(tagId)) {
            return res.status(400).json({
                message: "Invalid TagId!",
                success: false
            });
        }

        const deletedTag = await Tag.findByIdAndDelete(tagId);

        if (!deletedTag) {
            return res.status(404).json({
                message: "Tag not found!",
                success: false
            });
        }

        return res.status(200).json({
            message: "Tag deleted successfully!",
            deletedTag,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message,
            success: false
        });
    }
};