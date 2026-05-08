import User from "../models/User.js";
import Organization from "../models/Organization.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// @route   POST /api/auth/register
// @desc    Register a user or create an organization
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, organizationName, orgId } = req.body;

        if (!name || !email || !password || (!organizationName && !orgId)) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        if (await User.findOne({ email })) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let organization, workspaceId, role = "member";

        if (organizationName) {
            organization = new Organization({ name: organizationName });
            workspaceId = organization._id;
            role = "owner";
        } else {
            if (!mongoose.Types.ObjectId.isValid(orgId)) return res.status(400).json({ message: "Invalid Workspace ID" });
            const orgExists = await Organization.findById(orgId);
            if (!orgExists) return res.status(404).json({ message: "Organization not found" });
            workspaceId = orgId;
        }

        const user = new User({ name, email, password: hashedPassword, role, workspaceId });
        await user.save();

        if (organization) {
            organization.ownerId = user._id;
            await organization.save();
        }

        res.status(201).json({ message: "Registered successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

// @route   POST /api/auth/login
// @desc    Authenticate a user
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Missing credentials" });

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role, workspaceId: user.workspaceId },
            process.env.JWT_SECRET || "fallback_secret",
            { expiresIn: "1d" }
        );

        res.json({ message: "Login successful", token, user });
    } catch (error) {
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

