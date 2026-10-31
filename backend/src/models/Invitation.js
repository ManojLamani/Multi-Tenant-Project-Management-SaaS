import mongoose from "mongoose";

const InvitationSchema = new mongoose.Schema({
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "accepted", "revoked"], default: "pending" },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null }
}, {
    timestamps: true,
    toJSON: { transform(_doc, result) { delete result.tokenHash; return result; } }
});

InvitationSchema.index({ workspaceId: 1, email: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });
InvitationSchema.index({ workspaceId: 1, createdAt: -1 });
export default mongoose.model("Invitation", InvitationSchema);
