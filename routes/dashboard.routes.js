import express from "express";
import { getDashboardStats, employeeDashboard, employeeDashboardChart } from "../controllers/dashboard.controller.js";
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const router = express.Router();

router.get("/dashboard", cacheMiddleware(60), getDashboardStats);

// Employee Dashboard Route
router.get("/employee/:empId", cacheMiddleware(60), employeeDashboard);

// Employee Dashboard Chart Route
router.get("/employee-chart/:empId", cacheMiddleware(60), employeeDashboardChart);

export default router;
