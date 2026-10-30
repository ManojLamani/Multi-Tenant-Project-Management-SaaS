import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { objectId, taskInput, respondError } from "../utils/validation.js";

// @route   POST /api/tasks
// @desc    Create a task
export const createTask = async (req, res) => {
    try {
        const { title, description, status, projectId } = taskInput(req.body, true);

        const project = await Project.findOne({ _id: projectId, workspaceId: req.user.workspaceId });
        if (!project) return res.status(404).json({ message: "Project not found or unauthorized" });

        const task = await Task.create({
            title,
            description,
            status: status || "todo",
            projectId,
            workspaceId: req.user.workspaceId,
            completedBy: status === "done" ? req.user._id : null
        });

        res.status(201).json(task);
    } catch (error) {
        respondError(res, error);
    }
};

// @route   GET /api/tasks
// @desc    Get all tasks for the workspace
export const getTasks = async (req, res) => {
    try {
        const filter = { workspaceId: req.user.workspaceId };
        if (req.query.projectId !== undefined) {
            filter.projectId = objectId(req.query.projectId, "project ID");
            const project = await Project.exists({ _id: filter.projectId, workspaceId: req.user.workspaceId });
            if (!project) return res.status(404).json({ message: "Project not found" });
        }
        const tasks = await Task.find(filter)
            .populate("projectId", "name")
            .populate("completedBy", "name");
        res.json(tasks);
    } catch (error) {
        respondError(res, error);
    }
};

// @route   PUT /api/tasks/:id
// @desc    Update a task
export const updateTask = async (req, res) => {
    try {
        objectId(req.params.id, "task ID");
        const changes = taskInput(req.body);
        if (req.user.role === "member" && Object.keys(changes).some(key => key !== "status")) {
            return res.status(403).json({ message: "Members can only change task status" });
        }
        const task = await Task.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Update completedBy logic
        if (changes.status === "done" && task.status !== "done") {
            changes.completedBy = req.user._id;
        } else if (changes.status && changes.status !== "done") {
            changes.completedBy = null;
        }

        const updatedTask = await Task.findOneAndUpdate(
            { _id: req.params.id, workspaceId: req.user.workspaceId }, { $set: changes }, { returnDocument: "after", runValidators: true })
            .populate("projectId", "name")
            .populate("completedBy", "name");

        if (!updatedTask) return res.status(404).json({ message: "Task not found" });
        res.json(updatedTask);
    } catch (error) {
        respondError(res, error);
    }
};

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
export const deleteTask = async (req, res) => {
    try {
        objectId(req.params.id, "task ID");
        const result = await Task.deleteOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
        if (result.deletedCount === 0) return res.status(404).json({ message: "Task not found" });
        res.json({ message: "Task removed" });
    } catch (error) {
        respondError(res, error);
    }
};

