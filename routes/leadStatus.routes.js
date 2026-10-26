import { addLeadStatus, getAllLeadStatus, getLeadStatusById, updateLeadStatus, deleteLeadStatus } from "../controllers/leadStatus.controller.js";
import express from "express";
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const leadStatusRouter = express.Router();

leadStatusRouter.post("/add/:id", clearCacheOnMutation("/get"), addLeadStatus);
leadStatusRouter.get("/getall/:id", cacheMiddleware(300), getAllLeadStatus);
leadStatusRouter.get("/getone/:id", cacheMiddleware(300), getLeadStatusById);
leadStatusRouter.put("/update/:id", clearCacheOnMutation("/get"), updateLeadStatus);
leadStatusRouter.delete("/delete/:id",deleteLeadStatus);

export default leadStatusRouter;

