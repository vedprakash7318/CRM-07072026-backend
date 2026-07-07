import express from "express";
import { getDashboardStats, employeeDashboard, employeeDashboardChart } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/dashboard", getDashboardStats);

// Employee Dashboard Route
router.get("/employee/:empId", employeeDashboard);

// Employee Dashboard Chart Route
router.get("/employee-chart/:empId", employeeDashboardChart);

export default router;
