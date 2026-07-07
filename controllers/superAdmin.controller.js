import superAdmin from "../models/superAdmin.model.js";
import jwt from "jsonwebtoken";

export const superAdminRegister =  async (req, res)=>{
    try {
        const {userName, password} = req.body;
    if(!userName || !password){
        return res.status(404).json({
            message:"Some Credencials are missing!",
            success:false
        })
    }
    const existUser = await superAdmin.findOne({userName:userName});
    if(existUser){
        return res.status(400).json({
            message:"User already exist with this userName !",
            success:false,
        })
    }
    await superAdmin.create({
        userName:userName,
        password:password
    });
    return res.status(201).json({
        message:"registration successful",
        success:true,
    })
    } catch (error) {
      return res.status(500).json({
        message:error.message,
        success:false
      })  
    }
}
export const superAdminLogin =  async (req, res)=>{
    try {
        const {userName, password} = req.body;
    if(!userName || !password){
        return res.status(404).json({
            message:"Some Credencials are missing!",
            success:false
        })
    }
    const existUser = await superAdmin.findOne({userName:userName, password:password});
    if(!existUser){
        return res.status(400).json({
            message:"Please Enter Currect Credentials !",
            success:false,
        })
    }
    const token = jwt.sign(
        { id: existUser._id, role: "superadmin" },
        process.env.JWT_SECRET || "fallback_secret_key"
    );

    return res.status(200).json({
        message:"logedin successfuly",
        success:true,
        token,
        existUser:existUser
    })
    } catch (error) {
      return res.status(500).json({
        message:error.message || "internal server error",
        success:false
      })  
    }
}
