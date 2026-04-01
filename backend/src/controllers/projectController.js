import Project from "../models/Project.js";

// @route   POST /api/projects
// @desc    Create a project
// @access  Private (Owner, Manager)
export const createProject = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Please provide a project name" });
        }

        const project = await Project.create({
            name,
            description,
            workspaceId: req.user.workspaceId,
            createdBy: req.user._id
        });

        res.status(201).json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
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
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (project.workspaceId.toString() !== req.user.workspaceId.toString()) {
            return res.status(403).json({ message: "Not authorized to access this project" });
        }

        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json(updatedProject);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private (Owner only)
export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (project.workspaceId.toString() !== req.user.workspaceId.toString()) {
            return res.status(403).json({ message: "Not authorized to access this project" });
        }

        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: "Project removed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
