import mongoose from "mongoose";

const tagParentSchema = mongoose.Schema({
  tagParentName:{
    type:String,
    required:true,
    trim:true,
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
},{timestamps:true});

const TagParent = mongoose.model("TagParents", tagParentSchema);
export default TagParent;