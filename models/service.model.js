import mongoose from "mongoose";

const ServicesSchema = mongoose.Schema({
    servicesText:{
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

const Services = new mongoose.model("services", ServicesSchema);
export default Services;