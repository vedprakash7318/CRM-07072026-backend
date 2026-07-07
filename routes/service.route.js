import { addservices, getAllServices,getPublicServices, getservicesById, updateservices, deleteServices } from "../controllers/service.controller.js";
import express from "express";

const serviceRouter = express.Router();

serviceRouter.post("/add/:id", addservices);
serviceRouter.get("/get/:id", getAllServices);
serviceRouter.get("/get/:id", getservicesById);
serviceRouter.put("/update/:id", updateservices);
serviceRouter.delete("/delete/:id",deleteServices);
serviceRouter.get("/public/services", getPublicServices);


export default serviceRouter;  