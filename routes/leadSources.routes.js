import { addLeadSources, getAllLeadSources, getLeadSourcesById, updateLeadSources, deleteLeadSources } from "../controllers/leadSources.controller.js";
import express from "express";

const leadSourcesRouter = express.Router();

leadSourcesRouter.post("/add/:id", addLeadSources);
leadSourcesRouter.get("/getall/:id", getAllLeadSources);
leadSourcesRouter.get("/getone/:id", getLeadSourcesById);
leadSourcesRouter.put("/update/:id", updateLeadSources);
leadSourcesRouter.delete("/delete/:id",deleteLeadSources);

export default leadSourcesRouter;

