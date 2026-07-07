import mongoose from "mongoose";

const prioritySchema = mongoose.Schema({
    priorityText:{
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

const Priority = new mongoose.model("Priority", prioritySchema);
export default Priority;