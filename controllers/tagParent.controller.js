import TagParent from "../models/tagParent.model.js";
import Tag from "../models/tag.modal.js";

// CREATE
export const createTagParent = async (req, res) => {
  try {
    const { tagParentName, addedBy, addedByType } = req.body;

    const newTagParent = await TagParent.create({
      tagParentName,
      addedBy,
      addedByType
    });

    res.status(201).json({
      success: true,
      data: newTagParent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ALL
export const getAllTagParents = async (req, res) => {
  try {
    const data = await TagParent.find()
      .populate("addedBy").lean();

    const dataWithCount = await Promise.all(data.map(async (item) => {
      const count = await Tag.countDocuments({ parentId: item._id });
      return { ...item, usageCount: count };
    }));

    res.status(200).json({
      success: true,
      data: dataWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET SINGLE
export const getSingleTagParent = async (req, res) => {
  try {
    const data = await TagParent.findById(req.params.id)
      .populate("addedBy");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "TagParent not found"
      });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE
export const updateTagParent = async (req, res) => {
  try {
    const updated = await TagParent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "TagParent not found"
      });
    }

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE
export const deleteTagParent = async (req, res) => {
  try {
    const deleted = await TagParent.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "TagParent not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "TagParent deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};