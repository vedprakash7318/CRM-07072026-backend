import mongoose from "mongoose";

const superAdminSchema = mongoose.Schema({
    userName:{
        type:String,
        required:true,
        trim:true,
    },
    password:{
        type:String,
        required:true,
        unique:true
    },

},{timestamps:true})

const superAdmin = new mongoose.model("superadmin",superAdminSchema);
export default superAdmin