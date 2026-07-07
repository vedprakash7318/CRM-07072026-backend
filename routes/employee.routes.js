import { addEmployee,saveFCMToken, loginEmployee,getBlockedEmployees, updateEmployee, getAllEmployees, getEmployeeById, blockEmployee, unBlockEmployee, getEmployeeWorkStats, getEmployeeReport, getPublicEmployeesBySlug } from "../controllers/employee.controller.js";
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";

const employeeRouter = express.Router();

employeeRouter.post('/add/:id', verifyToken, addEmployee);
employeeRouter.put('/update/:id', verifyToken, updateEmployee);
employeeRouter.post('/login', loginEmployee);
employeeRouter.get('/getall/:id', verifyToken, getAllEmployees);
employeeRouter.get('/employees/blocked/:id', verifyToken, getBlockedEmployees);

employeeRouter.get('/getone/:id', verifyToken, getEmployeeById);
employeeRouter.put("/block/:id", verifyToken, blockEmployee);
employeeRouter.put("/unblock/:id", verifyToken, unBlockEmployee);

employeeRouter.post("/save-fcm", verifyToken, saveFCMToken);
employeeRouter.get('/emp-work', verifyToken, getEmployeeWorkStats);
employeeRouter.get('/report/:id', verifyToken, getEmployeeReport);

employeeRouter.get('/public/employees-by-slug/:slug', getPublicEmployeesBySlug);

export default employeeRouter;  