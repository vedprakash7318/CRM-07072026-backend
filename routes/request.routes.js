import express from "express";
import {
  requestByTags,
  getTagRequests,
  acceptTagRequest,
  rejectTagRequest,
  getAllRequestsByAdmin,
  getRequestsByEmployee,
  checkTagAssignment
} from "../controllers/request.contoller.js";

const router = express.Router();


// Employee
router.post("/check-tag-assignment", checkTagAssignment);
router.post("/request-tags", requestByTags);

// Admin
router.get("/tag-requests/:addedby", getTagRequests);
router.post("/tag-request/accept", acceptTagRequest);
router.post("/tag-request/reject", rejectTagRequest);
router.get("/admin/all-requests/:adminId", getAllRequestsByAdmin);

router.get("/employee/all-requests/:employeeId",getRequestsByEmployee);

export default router;
