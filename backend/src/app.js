import express from "express";
import cors from "cors";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import invitationRoutes from "./routes/invitationRoutes.js";
import { clientOrigins } from "./config/environment.js";

const app = express();

app.use(cors({
    origin(origin, callback) {
        if (!origin || clientOrigins().includes(origin)) return callback(null, true);
        return callback(Object.assign(new Error("Origin not allowed"), { status: 403 }));
    }
}));
app.use(express.json());

// Performance logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
    });
    next();
});

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/invitations", invitationRoutes);

app.get("/", (req, res) => {
    res.send("Backend server is running");
});

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
app.use((error, _req, res, _next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    res.status(status).json({ message: status === 400 ? "Invalid request" : status < 500 ? error.message : "Server error" });
});

export default app;
