import { addLeadSources, getAllLeadSources, getLeadSourcesById, updateLeadSources, deleteLeadSources } from "../controllers/leadSources.controller.js";
import express from "express";
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const leadSourcesRouter = express.Router();

leadSourcesRouter.post("/add/:id", clearCacheOnMutation("/get"), addLeadSources);
leadSourcesRouter.get("/getall/:id", cacheMiddleware(300), getAllLeadSources);
leadSourcesRouter.get("/getone/:id", cacheMiddleware(300), getLeadSourcesById);
leadSourcesRouter.put("/update/:id", clearCacheOnMutation("/get"), updateLeadSources);
leadSourcesRouter.delete("/delete/:id",deleteLeadSources);

export default leadSourcesRouter;

