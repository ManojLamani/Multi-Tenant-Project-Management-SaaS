import User from "../models/User.js";
import Organization from "../models/Organization.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// @route   POST /api/auth/register
// @desc    Register a user or create an organization
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, organizationName, orgId } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please enter name, email, and password" });
        }

        if (!organizationName && !orgId) {
            return res.status(400).json({ message: "Please provide either organizationName to create a new one, or orgId to join" });
        }

        const t0 = Date.now();
        const userExists = await User.findOne({ email });
        console.log(`[Reg] DB user lookup: ${Date.now() - t0}ms`);
        
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const t1 = Date.now();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        console.log(`[Reg] Password hashing: ${Date.now() - t1}ms`);

        let organization;
        let role = "member";
        let workspaceId;

        if (organizationName) {
            organization = new Organization({ name: organizationName });
            workspaceId = organization._id;
            role = "owner";
        } else if (orgId) {
            if (!mongoose.Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({ message: "Invalid Workspace ID format" });
            }
            
            const orgExists = await Organization.findById(orgId);
            if (!orgExists) {
                return res.status(404).json({ message: "Organization not found" });
            }
            workspaceId = orgId;
        }

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            workspaceId
        });

        const t2 = Date.now();
        const savePromises = [user.save()];
        if (organizationName) {
            organization.ownerId = user._id;
            savePromises.push(organization.save());
        }

        await Promise.all(savePromises);
        console.log(`[Reg] DB saves: ${Date.now() - t2}ms`);

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                workspaceId: user.workspaceId
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

// @route   POST /api/auth/login
// @desc    Authenticate a user
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please enter email and password" });
        }

        const t0 = Date.now();
        const user = await User.findOne({ email });
        console.log(`[Login] DB user lookup: ${Date.now() - t0}ms`);

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const t1 = Date.now();
        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[Login] Password verification: ${Date.now() - t1}ms`);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const secret = process.env.JWT_SECRET || "fallback_secret";
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                workspaceId: user.workspaceId
            },
            secret,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                workspaceId: user.workspaceId
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
};
