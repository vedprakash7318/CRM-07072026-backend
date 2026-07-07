import mongoose from "mongoose";

const adminSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    mobile: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    DateOfBirth: {
        type: String,
        trim: true
    },
    gender: {
        type: String,
        trim: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    companyType: {
        type: String,
        required: true,
        trim: true
    },
    street: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        trim: true
    },
    zipCode: {
        type: String,
        trim: true
    },
    blocked: {
        type: Boolean,
        required: true,
        default: false
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "superadmin",
        required: true
    },
    adminSlug: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    }

}, { timestamps: true })

const Admin = new mongoose.model("Admin", adminSchema);
export default Admin
