import express from "express";
const router = express.Router();

router.get("/ping", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Server is running"
    });
});

export default router;