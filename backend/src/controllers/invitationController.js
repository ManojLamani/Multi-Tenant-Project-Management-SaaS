import mongoose from "mongoose";
import Invitation from "../models/Invitation.js";
import User from "../models/User.js";
import { fields, InputError, objectId, respondError } from "../utils/validation.js";
import { newInvitation, normalizeEmail, validEmail } from "../utils/invitations.js";

export async function createInvitation(req, res) {
    try {
        fields(req.body, ["email"]);
        const email = normalizeEmail(req.body.email);
        if (!validEmail(email)) throw new InputError("Provide a valid email address");
        if (await User.exists({ email }).collation({ locale: "en", strength: 2 })) {
            return res.status(409).json({ message: "This email already has an account. Invitations are for new accounts." });
        }
        const secret = newInvitation();
        const invitation = await mongoose.connection.transaction(async session => {
            await Invitation.updateMany({ workspaceId: req.user.workspaceId, email, status: "pending" },
                { $set: { status: "revoked", revokedAt: new Date() } }, { session });
            const [created] = await Invitation.create([{
                workspaceId: req.user.workspaceId, email, createdBy: req.user._id,
                tokenHash: secret.tokenHash, expiresAt: secret.expiresAt
            }], { session });
            return created;
        });
        res.set("Cache-Control", "no-store");
        res.status(201).json({ invitation, token: secret.token });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "An invitation for this email is being updated. Please try again." });
        respondError(res, error);
    }
}

export async function listInvitations(req, res) {
    try {
        const invitations = await Invitation.find({ workspaceId: req.user.workspaceId }).sort({ createdAt: -1, _id: -1 }).limit(50);
        res.set("Cache-Control", "no-store");
        res.json(invitations);
    } catch (error) { respondError(res, error); }
}

export async function revokeInvitation(req, res) {
    try {
        objectId(req.params.id, "invitation ID");
        const invitation = await Invitation.findOneAndUpdate({
            _id: req.params.id, workspaceId: req.user.workspaceId, status: "pending"
        }, { $set: { status: "revoked", revokedAt: new Date() } }, { returnDocument: "after" });
        if (!invitation) return res.status(404).json({ message: "Pending invitation not found" });
        res.status(204).end();
    } catch (error) { respondError(res, error); }
}
