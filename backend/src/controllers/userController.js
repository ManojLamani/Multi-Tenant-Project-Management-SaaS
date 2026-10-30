import User from "../models/User.js";
import { fields, objectId, respondError } from "../utils/validation.js";

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private/Owner
export const updateUserRole = async (req, res) => {
    try {
        fields(req.body, ["role"]);
        const { role } = req.body;

        if (!["manager", "member"].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Only manager or member allowed." });
        }

        objectId(req.params.id, "user ID");
        const user = await User.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role === "owner") {
            return res.status(403).json({ message: "Workspace owners cannot be demoted through role management" });
        }

        user.role = role;
        await user.save();

        res.json({ message: "User role updated successfully", user });
    } catch (error) {
        respondError(res, error);
    }
};

// @route   GET /api/users
// @desc    Get all users within the current workspace
// @access  Private
export const getWorkspaceUsers = async (req, res) => {
    try {
        const users = await User.find({ workspaceId: req.user.workspaceId }).select("-password");
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
