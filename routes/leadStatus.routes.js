import { addLeadStatus, getAllLeadStatus, getLeadStatusById, updateLeadStatus, deleteLeadStatus } from "../controllers/leadStatus.controller.js";
import express from "express";

const leadStatusRouter = express.Router();

leadStatusRouter.post("/add/:id", addLeadStatus);
leadStatusRouter.get("/getall/:id", getAllLeadStatus);
leadStatusRouter.get("/getone/:id", getLeadStatusById);
leadStatusRouter.put("/update/:id", updateLeadStatus);
leadStatusRouter.delete("/delete/:id",deleteLeadStatus);

export default leadStatusRouter;

