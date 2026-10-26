import { addFollowupStatus, getAllFollowupStatus, getFollowupStatusById, updateFollowupStatus, deleteFollowupStatus } from "../controllers/followupStatus.controller.js";
import express from "express";
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const followupStatusRouter = express.Router();

followupStatusRouter.post("/add/:id", clearCacheOnMutation("/get"), addFollowupStatus);
followupStatusRouter.get("/getall/:id", cacheMiddleware(300), getAllFollowupStatus);
followupStatusRouter.get("/getone/:id", cacheMiddleware(300), getFollowupStatusById);
followupStatusRouter.put("/update/:id", clearCacheOnMutation("/get"), updateFollowupStatus);
followupStatusRouter.delete("/delete/:id", clearCacheOnMutation("/get"), deleteFollowupStatus);

export default followupStatusRouter;