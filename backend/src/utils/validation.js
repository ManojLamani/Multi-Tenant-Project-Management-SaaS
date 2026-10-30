import mongoose from "mongoose";

export class InputError extends Error {
    status = 400;
}

export function objectId(value, label = "ID") {
    if (!mongoose.isObjectIdOrHexString(value)) throw new InputError(`Invalid ${label}`);
    return value;
}

export function fields(body, allowed) {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Expected a JSON object");
    const unknown = Object.keys(body).filter(key => !allowed.includes(key));
    if (unknown.length) throw new InputError(`Unsupported fields: ${unknown.join(", ")}`);
    if (!Object.keys(body).length) throw new InputError("No changes supplied");
}

function text(value, label, maximum, required = false) {
    if (typeof value !== "string" || value.trim().length > maximum || (required && !value.trim())) {
        throw new InputError(`${label} must be ${required ? "a non-empty string" : "a string"} of at most ${maximum} characters`);
    }
    return value.trim();
}

export function projectInput(body, creating = false) {
    fields(body, ["name", "description"]);
    const result = {};
    if (creating || "name" in body) result.name = text(body.name, "Name", 200, true);
    if ("description" in body) result.description = text(body.description, "Description", 5000);
    return result;
}

export function taskInput(body, creating = false) {
    const editable = ["title", "description", "status", "priority", "assignedTo", "dueDate"];
    fields(body, creating ? [...editable, "projectId"] : editable);
    const result = {};
    if (creating || "title" in body) result.title = text(body.title, "Title", 200, true);
    if ("description" in body) result.description = text(body.description, "Description", 5000);
    if ("status" in body) {
        if (!["todo", "in-progress", "done"].includes(body.status)) throw new InputError("Invalid task status");
        result.status = body.status;
    }
    if (creating) result.projectId = objectId(body.projectId, "project ID");
    if ("priority" in body) {
        if (!["low", "medium", "high"].includes(body.priority)) throw new InputError("Invalid priority");
        result.priority = body.priority;
    }
    if ("assignedTo" in body) result.assignedTo = body.assignedTo === null || body.assignedTo === "" ? null : objectId(body.assignedTo, "assignee ID");
    if ("dueDate" in body) {
        if (body.dueDate === null || body.dueDate === "") result.dueDate = null;
        else {
            const value = body.dueDate;
            if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
                Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
                throw new InputError("Due date must be a valid date in YYYY-MM-DD format");
            }
            result.dueDate = new Date(`${value}T00:00:00.000Z`);
        }
    }
    return result;
}

export function respondError(res, error) {
    const status = error.status || (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);
    return res.status(status).json({ message: status === 500 ? "Server error" : error.message });
}
