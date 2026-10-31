import { test } from "node:test";
import assert from "node:assert/strict";
import Task from "../src/models/Task.js";
import Project from "../src/models/Project.js";
import { api, createMember, createWorkspace, useDatabase } from "./helpers.js";

useDatabase();
const auth = { type: "bearer" };

test("members can change status; managers and owners can manage task content", async () => {
    const owner = await createWorkspace();
    const member = await createMember(owner);
    const manager = await createMember(owner, "manager@example.com");
    await api.put(`/api/users/${manager.user._id}/role`).auth(owner.token, auth).send({ role: "manager" }).expect(200);
    const project = (await api.post("/api/projects").auth(owner.token, auth).send({ name: "Project" }).expect(201)).body;
    await api.post("/api/tasks").auth(member.token, auth).send({ title: "Bad", projectId: project._id }).expect(403);
    const task = (await api.post("/api/tasks").auth(manager.token, auth).send({ title: "Task", projectId: project._id }).expect(201)).body;
    await api.put(`/api/tasks/${task._id}`).auth(member.token, auth).send({ title: "Bad" }).expect(403);
    await api.delete(`/api/tasks/${task._id}`).auth(member.token, auth).expect(403);
    const completed = await api.put(`/api/tasks/${task._id}`).auth(member.token, auth).send({ status: "done" }).expect(200);
    assert.equal(completed.body.completedBy._id, member.user._id);
    const reopened = await api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send({ status: "todo" }).expect(200);
    assert.equal(reopened.body.completedBy, null);
    await api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send({ status: "done" }).expect(200);
    await api.delete(`/api/tasks/${task._id}`).auth(manager.token, auth).expect(200);
});

test("owners cannot demote themselves and foreign users cannot be managed", async () => {
    const owner = await createWorkspace();
    const outsider = await createWorkspace("other@example.com");
    const response = await api.put(`/api/users/${owner.user._id}/role`).auth(owner.token, auth).send({ role: "member" }).expect(403);
    assert.match(response.body.message, /cannot be demoted/);
    await api.put(`/api/users/${outsider.user._id}/role`).auth(owner.token, auth).send({ role: "manager" }).expect(404);
});

test("deleting a project removes only its tasks, and rolls back on cleanup failure", async t => {
    const owner = await createWorkspace();
    const first = (await api.post("/api/projects").auth(owner.token, auth).send({ name: "First" })).body;
    const second = (await api.post("/api/projects").auth(owner.token, auth).send({ name: "Second" })).body;
    for (const project of [first, second]) {
        await api.post("/api/tasks").auth(owner.token, auth).send({ title: "Task", projectId: project._id }).expect(201);
    }
    const failure = t.mock.method(Project, "deleteOne", async () => { throw new Error("Simulated delete failure"); });
    await api.delete(`/api/projects/${first._id}`).auth(owner.token, auth).expect(500);
    failure.mock.restore();
    assert.ok(await Project.exists({ _id: first._id }));
    assert.equal(await Task.countDocuments({ projectId: first._id }), 1);
    await api.delete(`/api/projects/${first._id}`).auth(owner.token, auth).expect(200);
    assert.equal(await Task.countDocuments({ projectId: first._id }), 0);
    assert.equal(await Task.countDocuments({ projectId: second._id }), 1);
});
