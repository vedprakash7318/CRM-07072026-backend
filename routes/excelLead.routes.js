import express from "express";
import multer from "multer";
import { 
  uploadExcelLeads, 
  getAdminExcelLeads, 
  getAdminExcelSheets,
  assignExcelLeads,
  unassignExcelLeads,
  getEmployeeExcelSheets,
  getEmployeeExcelLeads,
  updateExcelLead
} from "../controllers/excelLead.controller.js";

import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Setup multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Admin Routes
router.post("/upload", verifyToken, upload.single("file"), uploadExcelLeads);
router.get("/admin-sheets", verifyToken, getAdminExcelSheets);
router.get("/admin-leads", verifyToken, getAdminExcelLeads);
router.post("/assign", verifyToken, assignExcelLeads);
router.post("/unassign", verifyToken, unassignExcelLeads);

// Employee Routes
router.get("/employee-sheets", verifyToken, getEmployeeExcelSheets);
router.get("/employee-leads", verifyToken, getEmployeeExcelLeads);

// Common Routes
router.put("/update/:id", verifyToken, updateExcelLead);

export default router;
