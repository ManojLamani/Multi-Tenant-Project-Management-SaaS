import Task from "../models/Task.js";
import Project from "../models/Project.js";

// @route   POST /api/tasks
// @desc    Create a task
export const createTask = async (req, res) => {
    try {
        const { title, description, status, projectId } = req.body;
        if (!title || !projectId) return res.status(400).json({ message: "Title and ProjectId are required" });

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
        res.status(500).json({ message: error.message });
    }
};

// @route   GET /api/tasks
// @desc    Get all tasks for the workspace
export const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ workspaceId: req.user.workspaceId })
            .populate("projectId", "name")
            .populate("completedBy", "name");
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   PUT /api/tasks/:id
// @desc    Update a task
export const updateTask = async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Update completedBy logic
        if (req.body.status === "done" && task.status !== "done") {
            req.body.completedBy = req.user._id;
        } else if (req.body.status && req.body.status !== "done") {
            req.body.completedBy = null;
        }

        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate("projectId", "name")
            .populate("completedBy", "name");

        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
export const deleteTask = async (req, res) => {
    try {
        const result = await Task.deleteOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
        if (result.deletedCount === 0) return res.status(404).json({ message: "Task not found" });
        res.json({ message: "Task removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

