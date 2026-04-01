import express from "express";
import { updateUserRole, getWorkspaceUsers } from "../controllers/userController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getWorkspaceUsers);
router.put("/:id/role", protect, authorizeRoles("owner"), updateUserRole);

export default router;
