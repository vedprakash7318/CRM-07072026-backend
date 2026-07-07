import { superAdminRegister, superAdminLogin } from "../controllers/superAdmin.controller.js";
import express from "express"

const superAdminRouter = express.Router()

superAdminRouter.post('/register', superAdminRegister);
superAdminRouter.post('/login', superAdminLogin);

export default superAdminRouter