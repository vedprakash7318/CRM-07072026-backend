import { addPriority, getAllPriorities, getPriorityById, updatePriority, deletePriority } from "../controllers/priority.controller.js";
import express from "express";
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const priorityRouter = express.Router();

priorityRouter.post("/add/:id", clearCacheOnMutation("/get"), addPriority);
priorityRouter.get("/get/:id", cacheMiddleware(300), getAllPriorities);
priorityRouter.get("/getone/:id", cacheMiddleware(300), getPriorityById);
priorityRouter.put("/update/:id", clearCacheOnMutation("/get"), updatePriority);
priorityRouter.delete("/delete/:id", clearCacheOnMutation("/get"), deletePriority);

export default priorityRouter;