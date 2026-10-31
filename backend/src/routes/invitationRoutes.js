import { Router } from "express";
import { createInvitation, listInvitations, revokeInvitation } from "../controllers/invitationController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();
router.use(protect, authorizeRoles("owner"));
router.route("/").get(listInvitations).post(createInvitation);
router.delete("/:id", revokeInvitation);
export default router;
