import Project from "../models/Project.js";
import { objectId, projectInput, respondError } from "../utils/validation.js";

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
        const projects = await Project.find({ workspaceId: req.user.workspaceId })
            .populate("createdBy", "name email");
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
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
            { _id: req.params.id, workspaceId: req.user.workspaceId },
            { $set: changes },
            { new: true, runValidators: true }
        );
        if (!updatedProject) return res.status(404).json({ message: "Project not found" });
        res.json(updatedProject);
    } catch (error) {
        respondError(res, error);
    }
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

        await Project.deleteOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
        res.json({ message: "Project removed" });
    } catch (error) {
        respondError(res, error);
    }
};
