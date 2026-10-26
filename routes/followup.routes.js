import { addFollowup, getFollowupByAddedBy, getLastFollowup, getFollowupById, getAllFollowup, getNextFollowupByAddedBy } from "../controllers/followup.controller.js";
import express from "express";
import { clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const followupRouter = express.Router();

followupRouter.post("/add/:id", clearCacheOnMutation("/lead", "/followup", "/dashboard"), addFollowup);
followupRouter.get("/getall/:id", getAllFollowup);
followupRouter.get("/getfollowedby/:id", getFollowupByAddedBy);
followupRouter.get("/getLastfollowup/:id", getLastFollowup);
followupRouter.get("/get/:id", getFollowupById);
followupRouter.get("/getnext/:id", getNextFollowupByAddedBy);


export default followupRouter;

