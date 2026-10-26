import express from "express";
import {
    getReportSettings,
    updateReportSettings,
    sendUrgentReport
} from "../controllers/reportSettings.controller.js";

const router = express.Router();

router.get("/get/:adminId", getReportSettings);
router.post("/update", updateReportSettings);
router.post("/send-urgent", sendUrgentReport);

export default router;
