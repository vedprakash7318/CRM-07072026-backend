import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";

// routers
import superAdminRouter from "./routes/superAdmin.routes.js";
import adminRouter from "./routes/admin.routes.js";
import leadRouter from "./routes/lead.routes.js";
import employeeRouter from "./routes/employee.routes.js";
import leadStatusRouter from "./routes/leadStatus.routes.js";
import followupStatusRouter from "./routes/followupStatus.routes.js";
import priorityRouter from "./routes/priority.routes.js";
import followupRouter from "./routes/followup.routes.js";
import leadSourcesRouter from "./routes/leadSources.routes.js";
import tagRouter from "./routes/tag.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import request from "./routes/request.routes.js";
import serviceRouter from "./routes/service.route.js";
import notificationRouter from "./routes/NotificationToken.routes.js";
import tagParentRouter from "./routes/tagParent.route.js";
import reportRouter from "./routes/report.routes.js";
import inAppNotificationRouter from "./routes/notification.routes.js";
import leadRequestRouter from "./routes/leadRequest.routes.js";

// 🔥 Morning pending lead cron
import "./corn/pendingLeadMorningCron.js";
import "./corn/reminderCron.js";
import "./corn/missedLeadCron.js";
import "./corn/dailyReportCron.js";

dotenv.config();

connectDB();

const PORT = process.env.PORT || 3001;

const app = express();

// create http server
const server = http.createServer(app);

// socket io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"],
  },
});

global.io = io;

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });
});

app.use(cors());
app.use(express.json());

// routes
app.use("/digicoder/crm/api/v1/superadmin", superAdminRouter);
app.use("/digicoder/crm/api/v1/admin", adminRouter);
app.use("/digicoder/crm/api/v1/lead", leadRouter);
app.use("/digicoder/crm/api/v1/employee", employeeRouter);
app.use("/digicoder/crm/api/v1/leadstatus", leadStatusRouter);
app.use("/digicoder/crm/api/v1/leadSources", leadSourcesRouter);
app.use("/digicoder/crm/api/v1/notification", notificationRouter);
app.use("/digicoder/crm/api/v1/tag-parent", tagParentRouter);
app.use("/digicoder/crm/api/v1/tagParent", tagParentRouter); // Keep for backwards compatibility
app.use("/digicoder/crm/api/v1/report", reportRouter);
app.use("/digicoder/crm/api/v1/inapp-notification", inAppNotificationRouter);
app.use("/digicoder/crm/api/v1/lead-request", leadRequestRouter);
app.use("/digicoder/crm/api/v1/service", serviceRouter);
app.use("/digicoder/crm/api/v1/followupstatus", followupStatusRouter);
app.use("/digicoder/crm/api/v1/priority", priorityRouter);
app.use("/digicoder/crm/api/v1/followup", followupRouter);
app.use("/digicoder/crm/api/v1/tags", tagRouter);
app.use("/digicoder/crm/api/v1/dashboard", dashboardRoutes);
app.use("/digicoders/crm/api/v1/request", request);
app.use("/digicoder/crm/api/v1/report", reportRouter);

app.get("/", (_, res) => {
  res.send("I'm Coming from Backend");
});

// IMPORTANT
server.listen(PORT, () => {
  console.log(`Server is Running at http://localhost:${PORT}`);
});