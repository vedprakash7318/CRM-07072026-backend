import { addFollowupStatus, getAllFollowupStatus, getFollowupStatusById, updateFollowupStatus, deleteFollowupStatus } from "../controllers/followupStatus.controller.js";
import express from "express";

const followupStatusRouter = express.Router();

followupStatusRouter.post("/add/:id", addFollowupStatus);
followupStatusRouter.get("/getall/:id", getAllFollowupStatus);
followupStatusRouter.get("/getone/:id", getFollowupStatusById);
followupStatusRouter.put("/update/:id", updateFollowupStatus);
followupStatusRouter.delete("/delete/:id", deleteFollowupStatus);

export default followupStatusRouter;