import { addservices, getAllServices,getPublicServices, getservicesById, updateservices, deleteServices } from "../controllers/service.controller.js";
import express from "express";
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const serviceRouter = express.Router();

serviceRouter.post("/add/:id", clearCacheOnMutation("/get"), addservices);
serviceRouter.get("/get/:id", cacheMiddleware(300), getAllServices);
serviceRouter.get("/get/:id", cacheMiddleware(300), getservicesById);
serviceRouter.put("/update/:id", clearCacheOnMutation("/get"), updateservices);
serviceRouter.delete("/delete/:id",deleteServices);
serviceRouter.get("/public/services", cacheMiddleware(300), getPublicServices);


export default serviceRouter;  