import { addEmployee,saveFCMToken, loginEmployee,getBlockedEmployees, updateEmployee, getAllEmployees, getEmployeeById, blockEmployee, unBlockEmployee, getEmployeeWorkStats, getEmployeeReport, getPublicEmployeesBySlug } from "../controllers/employee.controller.js";
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { cacheMiddleware, clearCacheOnMutation } from "../middleware/cacheMiddleware.js";

const employeeRouter = express.Router();

employeeRouter.post('/add/:id', verifyToken, addEmployee);
employeeRouter.put('/update/:id', verifyToken, updateEmployee);
employeeRouter.post('/login', loginEmployee);
employeeRouter.get('/getall/:id', verifyToken, cacheMiddleware(60), getAllEmployees);
employeeRouter.get('/employees/blocked/:id', verifyToken, cacheMiddleware(60), getBlockedEmployees);

employeeRouter.get('/getone/:id', verifyToken, cacheMiddleware(60), getEmployeeById);
employeeRouter.put("/block/:id", verifyToken, blockEmployee);
employeeRouter.put("/unblock/:id", verifyToken, unBlockEmployee);

employeeRouter.post("/save-fcm", verifyToken, saveFCMToken);
employeeRouter.get('/emp-work', verifyToken, cacheMiddleware(60), getEmployeeWorkStats);
employeeRouter.get('/report/:id', verifyToken, cacheMiddleware(60), getEmployeeReport);

employeeRouter.get('/public/employees-by-slug/:slug', cacheMiddleware(60), getPublicEmployeesBySlug);

export default employeeRouter;  