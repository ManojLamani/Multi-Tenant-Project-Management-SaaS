import Task from "../models/Task.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { recordActivity, touchProject } from "../utils/activity.js";
import { InputError, objectId, taskInput, respondError } from "../utils/validation.js";

async function validateAssignee(assignedTo, workspaceId) {
    if (assignedTo && !await User.exists({ _id: assignedTo, workspaceId })) {
        throw new InputError("Assignee must belong to this workspace");
    }
}

// @route   POST /api/tasks
// @desc    Create a task
export const createTask = async (req, res) => {
    try {
        const input = taskInput(req.body, true);
        const { status, projectId } = input;
        await validateAssignee(input.assignedTo, req.user.workspaceId);

        const project = await Project.findOne({ _id: projectId, workspaceId: req.user.workspaceId });
        if (!project) return res.status(404).json({ message: "Project not found or unauthorized" });

        const task = await mongoose.connection.transaction(async session => {
            await touchProject(projectId, req.user.workspaceId, session);
            const [created] = await Task.create([{
                ...input,
                status: status || "todo",
                projectId,
                workspaceId: req.user.workspaceId,
                completedBy: status === "done" ? req.user._id : null
            }], { session });
            await recordActivity(created, req.user._id, "created", session);
            return created;
        });

        await task.populate([{ path: "assignedTo", select: "name" }, { path: "completedBy", select: "name" }]);
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
        for (const [key, allowed] of [["status", ["todo", "in-progress", "done"]], ["priority", ["low", "medium", "high"]]]) {
            if (req.query[key] !== undefined) {
                if (!allowed.includes(req.query[key])) throw new InputError(`Invalid ${key} filter`);
                filter[key] = req.query[key];
            }
        }
        if (req.query.assignedTo !== undefined) filter.assignedTo = objectId(req.query.assignedTo, "assignee ID");
        if (req.query.q !== undefined) {
            if (typeof req.query.q !== "string" || req.query.q.length > 100) throw new InputError("Search is limited to 100 characters");
            const expression = req.query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.$or = [{ title: { $regex: expression, $options: "i" } }, { description: { $regex: expression, $options: "i" } }];
        }
        const tasks = await Task.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .populate("projectId", "name")
            .populate("assignedTo", "name")
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
        await validateAssignee(changes.assignedTo, req.user.workspaceId);
        const updatedTask = await mongoose.connection.transaction(async session => {
            const task = await Task.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId }).session(session);
            if (!task) throw Object.assign(new Error("Task not found"), { status: 404 });
            await touchProject(task.projectId, req.user.workspaceId, session);
            const patch = { ...changes };
            if (patch.status === "done" && task.status !== "done") patch.completedBy = req.user._id;
            else if (patch.status && patch.status !== "done") patch.completedBy = null;
            const updated = await Task.findOneAndUpdate(
                { _id: task._id, workspaceId: req.user.workspaceId }, { $set: patch },
                { returnDocument: "after", runValidators: true, session });
            await recordActivity(updated, req.user._id, "updated", session, task, patch);
            return updated;
        });
        await updatedTask.populate([{ path: "projectId", select: "name" }, { path: "assignedTo", select: "name" }, { path: "completedBy", select: "name" }]);
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
        await mongoose.connection.transaction(async session => {
            const task = await Task.findOneAndDelete({ _id: req.params.id, workspaceId: req.user.workspaceId }, { session });
            if (!task) throw Object.assign(new Error("Task not found"), { status: 404 });
            await touchProject(task.projectId, req.user.workspaceId, session);
            await recordActivity(task, req.user._id, "deleted", session);
        });
        res.json({ message: "Task removed" });
    } catch (error) {
        respondError(res, error);
    }
};

