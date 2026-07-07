import express from "express";
import LeadRequest from "../models/leadRequest.model.js";
import Lead from "../models/lead.model.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Get all pending requests for an admin
router.get("/admin/:adminId", verifyToken, async (req, res) => {
  try {
    const { adminId } = req.params;
    const requests = await LeadRequest.find({ adminId, status: "pending" })
      .populate("leadId")
      .populate("requestedBy", "empName email")
      .populate("currentOwner", "empName email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Accept Request
router.put("/accept/:requestId", verifyToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await LeadRequest.findById(requestId);

    if (!request || request.status !== "pending") {
      return res.status(400).json({ success: false, message: "Invalid or already processed request" });
    }

    request.status = "accepted";
    await request.save();

    // Transfer the lead
    await Lead.findByIdAndUpdate(request.leadId, {
      leadAssignedTo: [request.requestedBy],
      acceptedBy: request.requestedBy,
      acceptedAt: new Date()
    });

    res.status(200).json({ success: true, message: "Request accepted and lead transferred." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reject Request
router.put("/reject/:requestId", verifyToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    
    const request = await LeadRequest.findById(requestId);

    if (!request || request.status !== "pending") {
      return res.status(400).json({ success: false, message: "Invalid or already processed request" });
    }

    request.status = "rejected";
    if (reason) request.rejectionReason = reason;
    await request.save();

    res.status(200).json({ success: true, message: "Request rejected." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
