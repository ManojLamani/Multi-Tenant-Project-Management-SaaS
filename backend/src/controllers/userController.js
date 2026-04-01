import User from "../models/User.js";

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private/Owner
export const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!["manager", "member"].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Only manager or member allowed." });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.workspaceId.toString() !== req.user.workspaceId.toString()) {
            return res.status(403).json({ message: "Not authorized to update this user" });
        }

        user.role = role;
        await user.save();

        res.json({ message: "User role updated successfully", user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
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
