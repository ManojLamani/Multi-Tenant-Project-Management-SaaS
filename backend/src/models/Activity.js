import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema({
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, required: true },
    taskTitle: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ["created", "updated", "deleted"], required: true },
    changes: [{ _id: false, field: String, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed }]
}, { timestamps: true });

ActivitySchema.index({ workspaceId: 1, projectId: 1, createdAt: -1, _id: -1 });
export default mongoose.model("Activity", ActivitySchema);
