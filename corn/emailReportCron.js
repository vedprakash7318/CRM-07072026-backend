import cron from "node-cron";
import ReportSetting from "../models/reportSettings.model.js";
import { sendReportEmail } from "../controllers/reportSettings.controller.js";

// Run every minute to check if any admin has a report scheduled for the current time
cron.schedule("* * * * *", () => {
    try {
        const now = new Date();
        // Convert current time to IST (UTC +5:30)
        const istDate = new Date(now.getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000));
        const currentHours = String(istDate.getUTCHours()).padStart(2, '0');
        const currentMinutes = String(istDate.getUTCMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;

        // Handle processing in background so node-cron doesn't complain about missed execution
        processReportsForTime(currentTime).catch(error => {
             console.error("[EmailReportCron] Background processing error:", error);
        });

    } catch (error) {
        console.error("[EmailReportCron] Sync error in cron:", error);
    }
});

async function processReportsForTime(currentTime) {
    // Find settings that match the current time
    const settingsToTrigger = await ReportSetting.find({ scheduleTime: currentTime });

    for (const setting of settingsToTrigger) {
        if (setting.emails && setting.emails.length > 0) {
            console.log(`[EmailReportCron] Triggering report for Admin ID: ${setting.adminId} at ${currentTime}`);
            // Fire and forget so we don't block subsequent emails in the same minute
            sendReportEmail(setting.adminId, setting.emails).catch(e => 
                console.error(`[EmailReportCron] Error sending report for ${setting.adminId}:`, e)
            );
        }
    }
}
