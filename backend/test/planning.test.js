import { test } from "node:test";
import assert from "node:assert/strict";
import { api, createMember, createWorkspace, useDatabase } from "./helpers.js";

useDatabase();
const auth = { type: "bearer" };

test("tasks support validated assignees, priorities, due dates and clearing optional fields", async () => {
    const owner = await createWorkspace();
    const member = await createMember(owner.user.workspaceId);
    const outsider = await createWorkspace("outsider@example.com");
    const project = (await api.post("/api/projects").auth(owner.token, auth).send({ name: "Launch" })).body;
    const input = { title: "Launch [v1]", projectId: project._id, assignedTo: member.user._id, priority: "high", dueDate: "2027-02-28" };
    const response = await api.post("/api/tasks").auth(owner.token, auth).send(input).expect(201);
    const task = response.body;
    assert.equal(task.assignedTo._id, member.user._id);
    assert.equal(task.priority, "high");
    assert.equal(task.dueDate, "2027-02-28T00:00:00.000Z");
    for (const changes of [{ assignedTo: outsider.user._id }, { dueDate: "2027-02-30" }, { priority: "urgent" }]) {
        await api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send(changes).expect(400);
    }
    await api.put(`/api/tasks/${task._id}`).auth(member.token, auth).send({ priority: "low" }).expect(403);
    const cleared = await api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send({ assignedTo: null, dueDate: null }).expect(200);
    assert.equal(cleared.body.assignedTo, null);
    assert.equal(cleared.body.dueDate, null);
});

test("task search uses literal text and combines workspace, project and metadata filters", async () => {
    const owner = await createWorkspace();
    const project = (await api.post("/api/projects").auth(owner.token, auth).send({ name: "Launch" })).body;
    for (const input of [
        { title: "Launch [v1]", priority: "high", assignedTo: owner.user._id },
        { title: "Launch other", priority: "low", status: "done" }
    ]) await api.post("/api/tasks").auth(owner.token, auth).send({ projectId: project._id, ...input }).expect(201);
    const filtered = await api.get("/api/tasks").query({ projectId: project._id, priority: "high", status: "todo", assignedTo: owner.user._id, q: "[v1]" }).auth(owner.token, auth).expect(200);
    assert.equal(filtered.body.length, 1);
    assert.equal(filtered.body[0].title, "Launch [v1]");
    await api.get("/api/tasks?priority=urgent").auth(owner.token, auth).expect(400);
});
