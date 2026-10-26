import cron from "node-cron";
import Followup from "../models/followup.model.js";
import Employee from "../models/employee.model.js";
import Notification from "../models/notification.model.js";
import admin from "../Firebase/firebaseAdmin.js";

// Run every minute
cron.schedule("* * * * *", async () => {
    try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Step 0: Bulk mark very old followups as sent so they don't clog the system
        // This is a single, non-blocking DB operation.
        await Followup.updateMany(
            { nextFollowupDate: { $lte: oneHourAgo }, notificationSent: false },
            { $set: { notificationSent: true } }
        );

        // Step 1: Fast query to find followups due recently (within the last hour)
        const candidateFollowups = await Followup.find({
            nextFollowupDate: { $lte: now, $gt: oneHourAgo },
            notificationSent: false
        }).lean();

        if (candidateFollowups.length === 0) return;

        const idsToFetch = [];

        // Step 2: Verify if each candidate is actually the latest followup for that lead
        for (const followup of candidateFollowups) {
            const newerFollowup = await Followup.findOne({
                leadId: followup.leadId,
                createdAt: { $gt: followup.createdAt }
            }).select('_id').lean();

            if (!newerFollowup) {
                // It is the latest! We should send a notification.
                idsToFetch.push(followup._id);
            } else {
                // Not the latest followup. Mark as sent so we stop checking it in future crons.
                await Followup.updateOne({ _id: followup._id }, { $set: { notificationSent: true } });
            }
        }

        if (idsToFetch.length === 0) return;

        // Step 3: Fetch the full Mongoose models to send notifications for the truly due & latest ones
        const dueFollowups = await Followup.find({ _id: { $in: idsToFetch } })
            .populate({
                path: 'leadId',
                populate: { path: 'leadAssignedTo' }
            });

        for (const followup of dueFollowups) {
            if (!followup.leadId || !followup.leadId.leadAssignedTo || followup.leadId.leadAssignedTo.length === 0) {
                // If no lead or no assigned employees, just mark it sent and continue
                await Followup.updateOne({ _id: followup._id }, { $set: { notificationSent: true } });
                continue;
            }

            const assignedEmployees = followup.leadId.leadAssignedTo;
            const leadName = followup.leadId.name || "Unknown Lead";

            for (const emp of assignedEmployees) {
                if (!emp || emp.blocked || !emp.fcmTokens || emp.fcmTokens.length === 0) continue;

                const payload = {
                    tokens: emp.fcmTokens,
                    notification: {
                        title: "⏰ Follow-up Time!",
                        body: `It's time for your follow-up with ${leadName}.`
                    },
                    data: {
                        url: "/todayReminders",
                        type: "REMINDER"
                    },
                    webpush: {
                        notification: {
                            title: "⏰ Follow-up Time!",
                            body: `It's time for your follow-up with ${leadName}.`,
                            icon: "/favicon.ico",
                            sound: "default",
                            requireInteraction: true,
                        },
                        fcmOptions: {
                            link: "/todayReminders"
                        }
                    }
                };

                try {
                    await admin.messaging().sendEachForMulticast(payload);

                    // Save notification to DB
                    await Notification.create({
                        employeeId: emp._id,
                        title: "⏰ Follow-up Time!",
                        body: `It's time for your follow-up with ${leadName}.`,
                        type: "REMINDER",
                        url: "/todayReminders"
                    });
                } catch (err) {
                    // Ignore errors for individual employees
                }
            }

            // Mark as sent using updateOne to bypass any schema validation issues on old documents
            await Followup.updateOne({ _id: followup._id }, { $set: { notificationSent: true } });
        }
    } catch (error) {
        // Console error removed
    }
});


