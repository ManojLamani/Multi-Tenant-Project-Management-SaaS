import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Middleware to protect routes (make sure user is logged in)
export const protect = async (req, res, next) => {
    try {
        // 1. Get the token from the Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided, authorization denied" });
        }

        // The header looks like "Bearer <token>", so we split by space and get the 2nd part
        const token = authHeader.split(" ")[1];

        // 2. Verify the token is valid
        const secret = process.env.JWT_SECRET || "fallback_secret";
        const decoded = jwt.verify(token, secret);

        // 3. Find the user in the database (excluding the password)
        const user = await User.findById(decoded.userId).select("-password");
        
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // 4. Attach the user to the request object so other routes can use it
        req.user = user;
        
        // 5. Move to the next function/route
        next();
        
    } catch (error) {
        console.error("Auth error:", error.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

// Middleware to check if a user has a specific role (e.g. "owner", "manager")
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        // Check if the current user's role is in the allowed roles array
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "You do not have permission to perform this action" });
        }
        
        next();
    };
};
