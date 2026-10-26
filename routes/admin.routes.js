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
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const adminRouter = express.Router();

adminRouter.post("/add/:id", verifyToken, registerAdmin);
adminRouter.put("/update/:id", verifyToken, updateAdmin);
adminRouter.post("/login", clearCacheOnMutation("/get"), adminLogin);
adminRouter.get("/getall", verifyToken, cacheMiddleware(60), getAllAdmins);
adminRouter.get("/getone/:id", verifyToken, cacheMiddleware(60), getAdminById);
adminRouter.put("/block/:id", verifyToken, blockAdmin);
adminRouter.put("/unblock/:id", verifyToken, unBlockAdmin);

// Password Reset Routes
adminRouter.post("/forget-password/request", clearCacheOnMutation("/get"), requestReset); // Send OTP
adminRouter.post("/forget-password/verify", clearCacheOnMutation("/get"), verifyOtp);     // Verify OTP
adminRouter.post("/forget-password/reset", clearCacheOnMutation("/get"), resetPassword);  // Reset password

export default adminRouter;
