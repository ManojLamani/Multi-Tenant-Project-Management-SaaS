import User from "../models/User.js";
import Organization from "../models/Organization.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/auth.js";

// @route   POST /api/auth/register
// @desc    Register a user or create an organization
export const registerUser = async (req, res) => {
    try {
        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            return res.status(400).json({ message: "Expected a JSON object" });
        }
        const { name, password, organizationName, orgId } = req.body;
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

        if (!name || !email || !password || (!organizationName && !orgId)) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        if (typeof name !== "string" || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72 ||
            (organizationName !== undefined && (typeof organizationName !== "string" || !organizationName.trim())) ||
            (organizationName && orgId)) {
            return res.status(400).json({ message: "Provide a name, valid email, password of 8–72 bytes, and one workspace option" });
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
        if (error.code === 11000) return res.status(409).json({ message: "User already exists" });
        res.status(500).json({ message: "Registration failed" });
    }
};

// @route   POST /api/auth/login
// @desc    Authenticate a user
export const loginUser = async (req, res) => {
    try {
        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            return res.status(400).json({ message: "Expected a JSON object" });
        }
        const { password } = req.body;
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        if (!email || typeof password !== "string" || !password) return res.status(400).json({ message: "Missing credentials" });

        const user = await User.findOne({ email }).select("+password");
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role, workspaceId: user.workspaceId },
            getJwtSecret(),
            { expiresIn: "1d", algorithm: "HS256" }
        );

        res.json({ message: "Login successful", token, user });
    } catch (error) {
        res.status(500).json({ message: "Login failed" });
    }
};

