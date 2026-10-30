import express from "express";
import mongoose from "mongoose";
const router = express.Router();

router.get("/ready", (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
});

router.get("/ping", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Server is running"
    });
});

export default router;
