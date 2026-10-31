import Activity from "../models/Activity.js";
import Project from "../models/Project.js";

export async function touchProject(projectId, workspaceId, session) {
    // Incrementing the parent version serializes task changes with archive/delete,
    // even when concurrent requests have the same millisecond timestamp.
    const result = await Project.updateOne({ _id: projectId, workspaceId, archivedAt: null },
        { $inc: { __v: 1 } }, { session });
    if (!result.matchedCount) {
        const exists = await Project.exists({ _id: projectId, workspaceId }).session(session);
        throw Object.assign(new Error(exists ? "Restore the archived project before making changes" : "Project not found"), { status: exists ? 409 : 404 });
    }
}

function value(item) {
    if (item == null) return null;
    if (item instanceof Date) return item.toISOString();
    return typeof item === "object" ? String(item) : item;
}

export async function recordActivity(task, actor, action, session, before = null, changes = {}) {
    const entries = Object.keys(changes).map(field => ({ field, from: value(before?.[field]), to: value(task[field]) }))
        .filter(change => change.from !== change.to);
    if (action === "updated" && !entries.length) return;
    await Activity.create([{
        workspaceId: task.workspaceId, projectId: task.projectId, taskId: task._id,
        taskTitle: task.title, actor, action, changes: entries
    }], { session });
}
