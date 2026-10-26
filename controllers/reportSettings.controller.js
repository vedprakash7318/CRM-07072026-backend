import ReportSetting from "../models/reportSettings.model.js";
import axios from 'axios';
import { getEmployeeWorkStats } from "./employee.controller.js";

// Get settings
export const getReportSettings = async (req, res) => {
    try {
        const { adminId } = req.params;
        let settings = await ReportSetting.findOne({ adminId });
        if (!settings) {
            settings = new ReportSetting({ adminId });
            await settings.save();
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error("Error getting report settings:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Update settings
export const updateReportSettings = async (req, res) => {
    try {
        const { adminId, emails, scheduleTime } = req.body;
        
        let settings = await ReportSetting.findOne({ adminId });
        if (settings) {
            settings.emails = emails;
            settings.scheduleTime = scheduleTime;
            await settings.save();
        } else {
            settings = new ReportSetting({ adminId, emails, scheduleTime });
            await settings.save();
        }
        
        res.status(200).json({ success: true, settings, message: "Settings updated successfully" });
    } catch (error) {
        console.error("Error updating report settings:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// HTML template generator
const generateEmailHTML = (dateStr, data) => {
    let tableRows = '';
    
    if (data && data.length > 0) {
        data.forEach(emp => {
            const totalWork = emp.totalWork || 0;
            const totalTarget = emp.employee?.target || 80;
            
            let performance = 'No Activity';
            const percentage = Math.round((totalWork / totalTarget) * 100);
            if (totalWork !== 0) {
                if (percentage < 30) performance = `Low (${percentage}%)`;
                else if (percentage < 70) performance = `Average (${percentage}%)`;
                else if (percentage < 100) performance = `Good (${percentage}%)`;
                else performance = `Achieved (${percentage}%)`;
            }

            const progress = Math.min(percentage, 100);
            
            let perfColor = '#6c5ce7';
            if (performance.includes('Achieved')) perfColor = '#27ae60';
            else if (performance.includes('Good')) perfColor = '#3498db';
            else if (performance.includes('Average')) perfColor = '#e67e22';
            else if (performance.includes('Low')) perfColor = '#c0392b';
            else if (performance.includes('No Activity')) perfColor = '#7f8c8d';

            tableRows += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${emp.employee?.name || 'Unknown'}</strong></td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${emp.leadsAdded?.count || 0}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${emp.followupsDone?.count || 0}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${emp.followupsDone?.uniqueLeads || 0}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${emp.publicLeadsAccepted || 0}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${totalWork} / ${totalTarget}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                        <span style="background-color: ${perfColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px;">${performance}</span>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${progress}%</td>
                </tr>
            `;
        });
    }

    return `
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 20px; }
            .container { background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 1000px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h2 { color: #2c3e50; margin: 0; }
            .header p { color: #7f8c8d; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #0984e3; color: white; padding: 12px; text-align: center; font-size: 14px; }
            th:first-child { text-align: left; }
            td { font-size: 14px; color: #2d3436; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Employee Performance Report</h2>
                <p>Date: ${dateStr}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Leads Added</th>
                        <th>Followups Done</th>
                        <th>Unique Leads</th>
                        <th>Public Leads</th>
                        <th>Work / Target</th>
                        <th>Performance</th>
                        <th>Progress</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    `;
};

// Send email function
export const sendReportEmail = async (adminId, emails) => {
    try {
        const now = new Date();
        const istDate = new Date(now.getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000));
        const dateStr = istDate.toISOString().split('T')[0]; // YYYY-MM-DD in IST
        
        // Mock req/res to call getEmployeeWorkStats locally
        const mockReq = { query: { addedBy: adminId, date: dateStr } };
        let responseData = null;
        const mockRes = {
            status: function(code) { return this; },
            json: function(data) { responseData = data; return this; }
        };

        await getEmployeeWorkStats(mockReq, mockRes);
        
        if (responseData && responseData.success && responseData.data && responseData.data.employees) {
            const htmlContent = generateEmailHTML(dateStr, responseData.data.employees);
            const subject = `today (${dateStr}) crm employee report`;

            // Send to each email
            for (const email of emails) {
                await axios.post('https://thedigicoders.com/Apis/V1/send_html_email', {
                    to: email,
                    subject: subject,
                    from_name: "CRM Admin",
                    html_content: htmlContent
                });
            }
            return { success: true };
        } else {
            throw new Error("Failed to fetch employee stats data");
        }
    } catch (error) {
        console.error("Error sending email report:", error.message);
        return { success: false, error: error.message };
    }
};

// Urgent trigger
export const sendUrgentReport = async (req, res) => {
    try {
        const { adminId } = req.body;
        const settings = await ReportSetting.findOne({ adminId });
        
        if (!settings || !settings.emails || settings.emails.length === 0) {
            return res.status(400).json({ success: false, message: "No email addresses configured." });
        }

        const result = await sendReportEmail(adminId, settings.emails);
        if (result.success) {
            res.status(200).json({ success: true, message: "Urgent email sent successfully!" });
        } else {
            res.status(500).json({ success: false, message: "Failed to send email." });
        }
    } catch (error) {
        console.error("Error in urgent trigger:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
