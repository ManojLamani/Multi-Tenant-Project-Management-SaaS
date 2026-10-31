import Project from "../models/Project.js";
import Task from "../models/Task.js";
import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import { fields, InputError, objectId, projectInput, respondError } from "../utils/validation.js";

// @route   POST /api/projects
// @desc    Create a project
// @access  Private (Owner, Manager)
export const createProject = async (req, res) => {
    try {
        const { name, description } = projectInput(req.body, true);

        const project = await Project.create({
            name,
            description,
            workspaceId: req.user.workspaceId,
            createdBy: req.user._id
        });

        res.status(201).json(project);
    } catch (error) {
        respondError(res, error);
    }
};

// @route   GET /api/projects
// @desc    Get all projects for the workspace
// @access  Private
export const getProjects = async (req, res) => {
    try {
        const archived = req.query.archived ?? "false";
        if (!["false", "true", "all"].includes(archived)) throw new InputError("Archived filter must be false, true, or all");
        const filter = { workspaceId: req.user.workspaceId };
        if (archived === "false") filter.archivedAt = null;
        if (archived === "true") filter.archivedAt = { $ne: null };
        const projects = await Project.find(filter)
            .populate("createdBy", "name email");
        res.json(projects);
    } catch (error) {
        respondError(res, error);
    }
};

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
export const updateProject = async (req, res) => {
    try {
        objectId(req.params.id, "project ID");
        const changes = projectInput(req.body);
        const updatedProject = await Project.findOneAndUpdate(
            { _id: req.params.id, workspaceId: req.user.workspaceId, archivedAt: null },
            { $set: changes },
            { returnDocument: "after", runValidators: true }
        );
        if (!updatedProject) {
            const exists = await Project.exists({ _id: req.params.id, workspaceId: req.user.workspaceId });
            return res.status(exists ? 409 : 404).json({ message: exists ? "Restore the archived project before making changes" : "Project not found" });
        }
        res.json(updatedProject);
    } catch (error) {
        respondError(res, error);
    }
};

export const setProjectArchived = async (req, res) => {
    try {
        objectId(req.params.id, "project ID");
        fields(req.body, ["archived"]);
        if (typeof req.body.archived !== "boolean") throw new InputError("Archived must be a boolean");
        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, workspaceId: req.user.workspaceId },
            { $set: { archivedAt: req.body.archived ? new Date() : null } },
            { returnDocument: "after", runValidators: true }
        ).populate("createdBy", "name email");
        if (!project) return res.status(404).json({ message: "Project not found" });
        res.json(project);
    } catch (error) { respondError(res, error); }
};

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private (Owner only)
export const deleteProject = async (req, res) => {
    try {
        objectId(req.params.id, "project ID");
        const project = await Project.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        await mongoose.connection.transaction(async session => {
            await Task.deleteMany({ projectId: project._id, workspaceId: req.user.workspaceId }, { session });
            await Activity.deleteMany({ projectId: project._id, workspaceId: req.user.workspaceId }, { session });
            await Project.deleteOne({ _id: project._id, workspaceId: req.user.workspaceId }, { session });
        });
        res.json({ message: "Project removed" });
    } catch (error) {
        respondError(res, error);
    }
};

export const getProjectActivity = async (req, res) => {
    try {
        objectId(req.params.id, "project ID");
        const project = await Project.exists({ _id: req.params.id, workspaceId: req.user.workspaceId });
        if (!project) return res.status(404).json({ message: "Project not found" });
        const events = await Activity.find({ projectId: req.params.id, workspaceId: req.user.workspaceId })
            .sort({ createdAt: -1, _id: -1 }).limit(50).populate("actor", "name");
        res.json(events);
    } catch (error) {
        respondError(res, error);
    }
};
