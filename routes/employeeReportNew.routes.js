import express from "express";
import { getDailyReports } from "../controllers/employeeReportNew.controller.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";

const employeeReportNewRouter = express.Router();

employeeReportNewRouter.get("/get-reports", cacheMiddleware(60), getDailyReports);

export default employeeReportNewRouter;
