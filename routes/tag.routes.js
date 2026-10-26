import { addTag, getAllTags, getTagById, updateTag, deleteTag, getAllTagsServerSidePagination } from "../controllers/tag.controller.js";
import express from "express";
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const tagRouter = express.Router();

tagRouter.post("/add/:id", clearCacheOnMutation("/get"), addTag);
tagRouter.get("/get-tag-serverside/:id", cacheMiddleware(60), getAllTagsServerSidePagination);
tagRouter.get("/getall/:id", cacheMiddleware(300), getAllTags);
tagRouter.get("/getone/:id", cacheMiddleware(300), getTagById);
tagRouter.put("/update/:id", clearCacheOnMutation("/get"), updateTag);
tagRouter.delete("/delete/:id", clearCacheOnMutation("/get"), deleteTag);

// ved  
export default tagRouter;