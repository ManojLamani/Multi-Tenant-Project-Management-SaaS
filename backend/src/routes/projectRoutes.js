import express from "express";
import { createProject, getProjects, updateProject, deleteProject } from "../controllers/projectController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
    .post(protect, authorizeRoles("owner", "manager"), createProject)
    .get(protect, getProjects);

router.route("/:id")
    .put(protect, authorizeRoles("owner", "manager"), updateProject)
    .delete(protect, authorizeRoles("owner"), deleteProject);

export default router;
