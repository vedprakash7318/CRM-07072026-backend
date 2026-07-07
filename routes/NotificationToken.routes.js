// import { Notification } from "../controllers/NotificationToken.controller.js";
// import express from "express";

// const notificationRouter = express.Router();

// notificationRouter.post("/save-token", Notification);


// export default notificationRouter;  


import express from "express";
import { sendNotification } from "../Firebase/sendNotification.js";

const router = express.Router();

router.post("/send", sendNotification);

export default router;
