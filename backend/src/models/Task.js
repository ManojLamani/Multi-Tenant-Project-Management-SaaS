import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    dueDate: { type: Date, default: null },
    status: {
        type: String,
        enum: ["todo", "in-progress", "done"],
        default: "todo"
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    }
}, { timestamps: true });

TaskSchema.index({ workspaceId: 1, projectId: 1, createdAt: -1 });

export default mongoose.model("Task", TaskSchema);
