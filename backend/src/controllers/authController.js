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

        if (await User.findOne({ email }).collation({ locale: "en", strength: 2 })) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        if (!organizationName && !mongoose.Types.ObjectId.isValid(orgId)) {
            return res.status(400).json({ message: "Invalid Workspace ID" });
        }
        const user = await mongoose.connection.transaction(async session => {
            const organization = organizationName ? new Organization({ name: organizationName.trim() }) : null;
            const workspaceId = organization?._id || orgId;
            if (!organization && !await Organization.exists({ _id: workspaceId }).session(session)) {
                throw Object.assign(new Error("Organization not found"), { status: 404 });
            }
            const [created] = await User.create([{
                name: name.trim(), email, password: hashedPassword,
                role: organization ? "owner" : "member", workspaceId
            }], { session });
            if (organization) {
                organization.ownerId = created._id;
                await organization.save({ session });
            }
            return created;
        });

        res.status(201).json({ message: "Registered successfully", user });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "User already exists" });
        if (error.status === 404) return res.status(404).json({ message: error.message });
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

        const user = await User.findOne({ email }).collation({ locale: "en", strength: 2 }).select("+password");
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

