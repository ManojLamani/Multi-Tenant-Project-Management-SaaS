import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";
import { readConfig } from "./config/environment.js";
import mongoose from "mongoose";

try {
    const config = readConfig();
    await connectDB(config.mongoUri);
    const server = app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
    server.on("error", async error => {
        console.error("Server failed to start:", error.code || "unknown error");
        await mongoose.disconnect();
        process.exitCode = 1;
    });
    let stopping = false;
    function shutdown() {
        if (stopping) return;
        stopping = true;
        const timer = setTimeout(() => process.exit(1), 10000);
        timer.unref();
        server.close(async () => {
            await mongoose.disconnect();
            clearTimeout(timer);
        });
        server.closeIdleConnections();
    }
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
} catch (error) {
    // Database errors can include connection details; keep those out of logs.
    console.error("Startup failed. Check MONGO_URI, JWT_SECRET, CLIENT_ORIGINS, PORT, and database availability.");
    await mongoose.disconnect();
    process.exitCode = 1;
}
