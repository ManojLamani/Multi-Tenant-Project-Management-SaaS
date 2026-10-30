import Activity from "../models/Activity.js";
import Project from "../models/Project.js";

export async function touchProject(projectId, workspaceId, session) {
    // Writing the parent serializes task changes against concurrent project deletion.
    const result = await Project.updateOne({ _id: projectId, workspaceId }, { $set: { updatedAt: new Date() } }, { session });
    if (!result.matchedCount) throw Object.assign(new Error("Project not found"), { status: 404 });
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
