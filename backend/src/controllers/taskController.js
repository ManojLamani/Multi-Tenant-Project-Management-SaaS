import Task from "../models/Task.js";
import Project from "../models/Project.js";

// @route   POST /api/tasks
// @desc    Create a task
// @access  Private
export const createTask = async (req, res) => {
    try {
        const { title, description, status, projectId } = req.body;

        if (!title || !projectId) {
            return res.status(400).json({ message: "Please provide a task title and projectId" });
        }

        const project = await Project.findById(projectId);
        if (!project || project.workspaceId.toString() !== req.user.workspaceId.toString()) {
            return res.status(404).json({ message: "Project not found or unauthorized" });
        }

        const taskData = {
            title,
            description,
            status,
            projectId,
            workspaceId: req.user.workspaceId
        };

        if (status === 'done') {
            taskData.completedBy = req.user._id;
        }

        const task = await Task.create(taskData);
        await task.populate("completedBy", "name");

        res.status(201).json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// @route   GET /api/tasks
// @desc    Get all tasks for the workspace
// @access  Private
export const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ workspaceId: req.user.workspaceId })        
            .populate("projectId", "name")
            .populate("completedBy", "name");
        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
export const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (task.workspaceId.toString() !== req.user.workspaceId.toString()) {
            return res.status(403).json({ message: "Not authorized to access this task" });
        }

        // Logic for setting completedBy
        if (req.body.status === 'done' && task.status !== 'done') {
            req.body.completedBy = req.user._id;
        } else if (req.body.status && req.body.status !== 'done') {
            // Unset completedBy if status is moved away from done
            req.body.$unset = { completedBy: 1 };
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate("completedBy", "name");

        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
export const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (task.workspaceId.toString() !== req.user.workspaceId.toString()) {
            return res.status(403).json({ message: "Not authorized to access this task" });
        }

        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: "Task removed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
