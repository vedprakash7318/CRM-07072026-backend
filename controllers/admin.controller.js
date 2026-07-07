import Admin from "../models/admin.model.js";
import superAdmin from "../models/superAdmin.model.js";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv'
import generateSlug from "../utils/generateSlug.js";
import jwt from "jsonwebtoken";

dotenv.config({})
const otpStore = {}; 
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

// Function to generate random OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
};

// Function to send email
const sendOTPEmail = async (email, otp) => {

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP - DigiCoder CRM',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
                <p style="font-size: 16px; color: #555;">Hello,</p>
                <p style="font-size: 16px; color: #555;">
                    You have requested to reset your password for DigiCoder CRM. Please use the following OTP to verify your identity:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 5px; letter-spacing: 3px;">
                        ${otp}
                    </span>
                </div>
                <p style="font-size: 14px; color: #888;">
                    This OTP is valid for 10 minutes only. If you didn't request this password reset, please ignore this email.
                </p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">
                    © DigiCoder Technologies (P) Ltd. All rights reserved.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
};
  
// Register Admin
export const registerAdmin = async (req, res) => {

    try {

        const addedBy = req.params.id;

        const {
            name,
            mobile,
            email,
            password,
            DateOfBirth,
            gender,
            companyName,
            companyType,
            street,
            city,
            state,
            country,
            zipCode
        } = req.body;

        // Validation
        if (!name || !mobile || !email || !password) {

            return res.status(400).json({
                message: "Something is missing, All fields are required!",
                success: false
            });

        }

        // Super Admin Check
        const existAddedBy = await superAdmin.findOne({
            _id: addedBy
        });

        if (!existAddedBy) {

            return res.status(400).json({
                message: "Invalid addedBy Id!",
                success: false,
            });

        }

        // Mobile Check
        let existUser = await Admin.findOne({
            mobile
        });

        if (existUser) {

            return res.status(400).json({
                message: "A user already exists with this mobile number!",
                success: false,
            });

        }

        // Email Check
        existUser = await Admin.findOne({
            email
        });

        if (existUser) {

            return res.status(400).json({
                message: "A user already exists with this email!",
                success: false,
            });

        }

        // =========================
        // GENERATE SLUG
        // =========================

        let adminSlug = generateSlug(companyName);

        // Check Duplicate Slug
        const existingSlug = await Admin.findOne({
            adminSlug
        });

        // If Exists
        if (existingSlug) {

            adminSlug = `${adminSlug}-${Date.now()}`;

        }

        // =========================
        // CREATE ADMIN
        // =========================

        const user = await Admin.create({

            name,
            mobile,
            email,
            password,

            gender,
            DateOfBirth,

            companyName,
            companyType,

            street,
            city,
            state,
            country,
            zipCode,

            addedBy,

            adminSlug

        });

        return res.status(201).json({

            message: "Admin registered successfully!",

            success: true,

            user

        });

    } catch (error) {

        return res.status(500).json({

            message:
                error.message ||
                "Internal server error, while adding admin!",

            success: false,

        });

    }

};

// Admin Login
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Some credentials are missing!",
                success: false
            });
        }

        const existUser = await Admin.findOne({
            $or: [{ email: email, password: password }, { mobile: email, password: password }]
        });

        if (!existUser) {
            return res.status(400).json({
                message: "Please enter correct credentials!",
                success: false,
            });
        }

        if (existUser.blocked === true) {
            return res.status(400).json({
                message: "You are blocked by your Admin! Contact DigiCoder Technologies (P) Ltd",
                success: false
            });
        }

        const token = jwt.sign(
            { id: existUser._id, role: "admin" },
            process.env.JWT_SECRET || "fallback_secret_key"
        );

        return res.status(200).json({
            message: "Logged in successfully",
            existUser: existUser,
            token,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal server error, while Login Admin!",
            success: false
        });
    }
};

// Get All Admins (SuperAdmin only)
export const getAllAdmins = async (req, res) => {
    try {
        const allAdmins = await Admin.find().populate("addedBy");

        if (!allAdmins || allAdmins.length === 0) {
            return res.status(404).json({
                message: "Admins not found!",
                success: false
            });
        }

        return res.status(200).json({
            message: "These are registered Admins",
            admins: allAdmins,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal Server Error, while fetching all admins!",
            success: false
        });
    }
};

// Get Admin By ID
export const getAdminById = async (req, res) => {
    try {
        const adminId = req.params.id;
        const admin = await Admin.findOne({ _id: adminId }).populate("addedBy");

        if (!admin) {
            return res.status(404).json({
                message: "Invalid Admin Id!",
                success: false
            });
        }

        return res.status(200).json({
            message: "This is the registered Admin",
            admin,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal Server Error, while fetching admin by id!",
            success: false
        });
    }
};

// Block Admin
export const blockAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;

        if (!adminId) {
            return res.status(404).json({
                message: "Admin Not Found!",
                success: false
            });
        }

        await Admin.findByIdAndUpdate({ _id: adminId }, { $set: { blocked: true } });

        return res.status(200).json({
            message: "Admin Blocked Successfully!",
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal Server Error while blocking admin!",
            success: false
        });
    }
};

// Unblock Admin
export const unBlockAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;

        if (!adminId) {
            return res.status(404).json({
                message: "Admin Not Found!",
                success: false
            });
        }

        await Admin.findByIdAndUpdate({ _id: adminId }, { $set: { blocked: false } });

        return res.status(200).json({
            message: "Admin Unblocked Successfully!",
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal Server Error while unblocking admin!",
            success: false
        });
    }
};

// Update Admin
export const updateAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;
        const updateFields = req.body;

        if (!adminId) {
            return res.status(400).json({
                message: "Admin ID is required!",
                success: false
            });
        }

        // Check if the admin exists
        const existingAdmin = await Admin.findById(adminId);
        if (!existingAdmin) {
            return res.status(404).json({
                message: "Admin not found!",
                success: false
            });
        }

        // Update the admin with the provided fields
        const updatedAdmin = await Admin.findByIdAndUpdate(
            adminId,
            { $set: updateFields },
            { new: true } // Return updated admin
        );

        return res.status(200).json({
            message: "Admin updated successfully!",
            updatedAdmin,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Internal Server Error while updating admin",
            success: false
        });
    }
};

// Request OTP (step 1) - Updated with email functionality
export const requestReset = async (req, res) => {
    try {
        const { email } = req.body;
  
        if (!email) {
            return res.status(400).json({ message: "Email is required", success: false });
        }

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: "Invalid Email!", success: false });
        }

        // Generate a random 6-digit OTP
        const otp = generateOTP();
   
        
        // Store OTP with expiration time (10 minutes)
        otpStore[email] = { 
            otp, 
            expiresAt: Date.now() + 10 * 60 * 1000 
        };

        // Send OTP to email
        const emailSent = await sendOTPEmail(email, otp);
        
        if (!emailSent) {
            return res.status(500).json({
                message: "Failed to send OTP email. Please try again.",
                success: false
            });
        }

        return res.status(200).json({
            message: "OTP sent successfully to your email address",
            success: true
        });
    } catch (error) {
        return res.status(500).json({ 
            message: error.message || "Server error", 
            success: false 
        });
    }
};

// Verify OTP (step 2) - Updated with expiration check
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ 
                message: "Email and OTP are required", 
                success: false 
            });
        }

        // Check if OTP exists for this email
        if (!otpStore[email]) {
            return res.status(401).json({
                message: "OTP not found or expired. Please request a new OTP.",
                success: false
            });
        }

        // Check if OTP has expired
        if (Date.now() > otpStore[email].expiresAt) {
            delete otpStore[email]; // Clean up expired OTP
            return res.status(401).json({
                message: "OTP has expired. Please request a new OTP.",
                success: false
            });
        }

        // Verify the OTP
        if (otpStore[email].otp === otp) {
            return res.status(200).json({
                message: "OTP verified successfully",
                success: true
            });
        }

        return res.status(401).json({
            message: "Invalid OTP",
            success: false
        });

    } catch (error) {
        return res.status(500).json({ 
            message: error.message || "Server error", 
            success: false 
        });
    }
};

// Reset Password (step 3) - Updated with expiration check
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ 
                message: "Email, OTP, and new password are required", 
                success: false 
            });
        }

        // Check if OTP exists and is valid
        if (!otpStore[email]) {
            return res.status(401).json({
                message: "OTP not found or expired. Please request a new OTP.",
                success: false
            });
        }

        // Check if OTP has expired
        if (Date.now() > otpStore[email].expiresAt) {
            delete otpStore[email]; // Clean up expired OTP
            return res.status(401).json({
                message: "OTP has expired. Please request a new OTP.",
                success: false
            });
        }

        // Check if OTP matches
        if (otpStore[email].otp === otp) {
            // Find the admin with the given email
            const admin = await Admin.findOne({ email });

            if (!admin) {
                return res.status(404).json({ 
                    message: "Admin not found", 
                    success: false 
                });
            }

            // Check if the new password is the same as the current password
            if (newPassword === admin.password) {
                return res.status(400).json({ 
                    message: "New password cannot be the same as the current password", 
                    success: false 
                });
            }

            // Reset the password
            admin.password = newPassword;
            await admin.save();

            // Clear the OTP after password reset
            delete otpStore[email];

            return res.status(200).json({
                message: "Password has been updated successfully",
                success: true
            });
        }

        return res.status(401).json({ 
            message: "Invalid OTP", 
            success: false 
        });

    } catch (error) {
        return res.status(500).json({ 
            message: error.message || "Server error", 
            success: false 
        });
    }
};