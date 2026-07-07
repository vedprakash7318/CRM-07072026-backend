import express from "express";
import { getEmployeeDailyReport } from "../controllers/report.controller.js";

const router = express.Router();

router.get("/employee/:empId", getEmployeeDailyReport);

export default router;
