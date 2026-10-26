import mongoose from 'mongoose';

const reportSettingsSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
        unique: true
    },
    emails: {
        type: [String],
        default: ['vedprakashvp9956@gmail.com']
    },
    scheduleTime: {
        type: String,
        default: '19:00' // 24-hour format HH:mm
    }
}, { timestamps: true });

export default mongoose.model('ReportSetting', reportSettingsSchema);
