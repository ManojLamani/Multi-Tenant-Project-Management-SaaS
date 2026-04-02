import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
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

export default mongoose.model("Task", TaskSchema);