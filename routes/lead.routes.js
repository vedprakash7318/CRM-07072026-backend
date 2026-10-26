import express from "express";
import { addLead, employeeNegativeLeads, getAcceptedPublicLeads, addPublicEnquiry, getAvailablePublicLeads, acceptPublicLead, addManyLead, employeeClosedLeads, getTodayReminders, getAssignedLeads, getPendingLeadsByEmployee, getUnassignedLeads, employeesAllLeads, getAllLeads, deleteLead, restoreLead, assignLead, updateLead, negativedLead, closedLead, UnclosedLead, UnnegativedLead, unassignLeads, getAllDeletedLeads, searchLeads, getMissedLeadsByEmployee, getAdminPublicEnquiries, getEmployeeReport, getEmployeeReportDetails, getEmployeeActionDetails } from "../controllers/lead.controller.js";
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";


const leadRouter = express.Router()

leadRouter.get("/employee-report", cacheMiddleware(60), getEmployeeReport);
leadRouter.get("/employee-report-details", cacheMiddleware(60), getEmployeeReportDetails);
leadRouter.get("/employee-action-details", cacheMiddleware(60), getEmployeeActionDetails);



leadRouter.post("/add/:id", clearCacheOnMutation("/lead", "/dashboard"), addLead);
leadRouter.post("/addmany/:id", clearCacheOnMutation("/lead", "/dashboard"), addManyLead);
leadRouter.get("/getall/:id", cacheMiddleware(60), getAllLeads);
leadRouter.get("/pendingleads/:id", cacheMiddleware(60), getPendingLeadsByEmployee);
leadRouter.get("/getDeletedall/:id", cacheMiddleware(60), getAllDeletedLeads);
leadRouter.get("/getAssignedLeads/:id", cacheMiddleware(60), getAssignedLeads);
leadRouter.get("/getUnassignedLeads/:id", cacheMiddleware(60), getUnassignedLeads);
leadRouter.get("/empgetall/:id", cacheMiddleware(60), employeesAllLeads);
leadRouter.get("/closed-leads/:id", cacheMiddleware(60), employeeClosedLeads);
leadRouter.get("/negative-leads/:id", cacheMiddleware(60), employeeNegativeLeads);
leadRouter.get("/today-reminders/:id", cacheMiddleware(60), getTodayReminders);
leadRouter.get("/missed-leads/:empId", cacheMiddleware(60), getMissedLeadsByEmployee);
leadRouter.put("/update/:id", clearCacheOnMutation("/lead", "/dashboard"), updateLead);
leadRouter.put("/delete/:id", clearCacheOnMutation("/lead", "/dashboard"), deleteLead);
leadRouter.put("/restore/:id", clearCacheOnMutation("/lead", "/dashboard"), restoreLead);
leadRouter.put("/assign", clearCacheOnMutation("/lead", "/dashboard"), assignLead);
leadRouter.put("/unassign", clearCacheOnMutation("/lead", "/dashboard"), unassignLeads);
leadRouter.put("/negative/:id", clearCacheOnMutation("/lead", "/dashboard"), negativedLead);
leadRouter.put("/closed/:id", clearCacheOnMutation("/lead", "/dashboard"), closedLead);
leadRouter.put("/unclosed/:id", clearCacheOnMutation("/lead", "/dashboard"), UnclosedLead);
leadRouter.put("/UnnegativedLead/:id", clearCacheOnMutation("/lead", "/dashboard"), UnnegativedLead);
leadRouter.get('/search', cacheMiddleware(60), searchLeads);


leadRouter.post("/public-enquiry", clearCacheOnMutation("/lead"), addPublicEnquiry);


leadRouter.get("/available-public-leads/:employeeId", cacheMiddleware(60), getAvailablePublicLeads);

leadRouter.put("/accept-public-lead", clearCacheOnMutation("/lead", "/dashboard"), acceptPublicLead);
leadRouter.get("/accepted-public-leads/:employeeId", cacheMiddleware(60), getAcceptedPublicLeads);
leadRouter.get("/admin-public-enquiries/:id", cacheMiddleware(60), getAdminPublicEnquiries);

export default leadRouter
