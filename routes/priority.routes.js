import { addPriority, getAllPriorities, getPriorityById, updatePriority, deletePriority } from "../controllers/priority.controller.js";
import express from "express";

const priorityRouter = express.Router();

priorityRouter.post("/add/:id", addPriority);
priorityRouter.get("/get/:id", getAllPriorities);
priorityRouter.get("/get/:id", getPriorityById);
priorityRouter.put("/update/:id", updatePriority);
priorityRouter.delete("/delete/:id",deletePriority);


export default priorityRouter;  