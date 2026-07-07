import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
    registerAdmin,
    adminLogin,
    getAllAdmins,
    getAdminById,
    blockAdmin,
    unBlockAdmin,
    updateAdmin,
    requestReset,    // New route for OTP request
    verifyOtp,       // New route for OTP verification
    resetPassword    // New route for resetting password
} from "../controllers/admin.controller.js";

const adminRouter = express.Router();

adminRouter.post("/add/:id", verifyToken, registerAdmin);
adminRouter.put("/update/:id", verifyToken, updateAdmin);
adminRouter.post("/login", adminLogin);
adminRouter.get("/getall", verifyToken, getAllAdmins);
adminRouter.get("/getone/:id", verifyToken, getAdminById);
adminRouter.put("/block/:id", verifyToken, blockAdmin);
adminRouter.put("/unblock/:id", verifyToken, unBlockAdmin);

// Password Reset Routes
adminRouter.post("/forget-password/request", requestReset); // Send OTP
adminRouter.post("/forget-password/verify", verifyOtp);     // Verify OTP
adminRouter.post("/forget-password/reset", resetPassword);  // Reset password

export default adminRouter;
