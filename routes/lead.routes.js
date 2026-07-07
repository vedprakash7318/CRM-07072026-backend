import express from "express";
import { addLead,employeeNegativeLeads,getAcceptedPublicLeads,addPublicEnquiry,getAvailablePublicLeads,acceptPublicLead, addManyLead,employeeClosedLeads,getTodayReminders,getAssignedLeads,getPendingLeadsByEmployee,getUnassignedLeads,employeesAllLeads,getAllLeads, deleteLead,restoreLead, assignLead,updateLead,negativedLead,closedLead ,UnclosedLead,UnnegativedLead,unassignLeads,getAllDeletedLeads, searchLeads, getMissedLeadsByEmployee, getAdminPublicEnquiries} from "../controllers/lead.controller.js";


const leadRouter = express.Router()

leadRouter.post("/add/:id",addLead);  
leadRouter.post("/addmany/:id",addManyLead);
leadRouter.get("/getall/:id",getAllLeads);
leadRouter.get("/pendingleads/:id",getPendingLeadsByEmployee);
leadRouter.get("/getDeletedall/:id",getAllDeletedLeads);
leadRouter.get("/getAssignedLeads/:id",getAssignedLeads);
leadRouter.get("/getUnassignedLeads/:id",getUnassignedLeads);
leadRouter.get("/empgetall/:id",employeesAllLeads);
leadRouter.get("/closed-leads/:id", employeeClosedLeads);
leadRouter.get("/negative-leads/:id", employeeNegativeLeads);
leadRouter.get("/today-reminders/:id",getTodayReminders);
leadRouter.get("/missed-leads/:empId", getMissedLeadsByEmployee);
leadRouter.put("/update/:id",updateLead);  
leadRouter.put("/delete/:id",deleteLead);
leadRouter.put("/restore/:id",restoreLead);
leadRouter.put("/assign",assignLead);  
leadRouter.put("/unassign",unassignLeads);
leadRouter.put("/negative/:id",negativedLead);
leadRouter.put("/closed/:id",closedLead);
leadRouter.put("/unclosed/:id",UnclosedLead);
leadRouter.put("/UnnegativedLead/:id",UnnegativedLead);
leadRouter.get('/search', searchLeads);


leadRouter.post("/public-enquiry",addPublicEnquiry);


leadRouter.get("/available-public-leads/:employeeId",getAvailablePublicLeads);

leadRouter.put("/accept-public-lead",acceptPublicLead);
leadRouter.get("/accepted-public-leads/:employeeId",getAcceptedPublicLeads);
leadRouter.get("/admin-public-enquiries/:id", getAdminPublicEnquiries);

export default leadRouter
