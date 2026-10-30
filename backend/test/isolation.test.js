import { test } from "node:test";
import assert from "node:assert/strict";
import Project from "../src/models/Project.js";
import Task from "../src/models/Task.js";
import { api, createWorkspace, useDatabase } from "./helpers.js";

useDatabase();

async function setup() {
    const first = await createWorkspace("first@example.com");
    const second = await createWorkspace("second@example.com");
    const project = (await api.post("/api/projects").auth(first.token, { type: "bearer" }).send({ name: "Private" }).expect(201)).body;
    const task = (await api.post("/api/tasks").auth(first.token, { type: "bearer" }).send({ title: "Private task", projectId: project._id }).expect(201)).body;
    return { first, second, project, task };
}

test("workspaces cannot list, mutate, delete or attach tasks to another workspace's records", async () => {
    const { second, project, task } = await setup();
    const auth = { type: "bearer" };
    const projects = await api.get("/api/projects").auth(second.token, auth).expect(200);
    const tasks = await api.get("/api/tasks").auth(second.token, auth).expect(200);
    assert.deepEqual(projects.body, []);
    assert.deepEqual(tasks.body, []);
    await api.put(`/api/projects/${project._id}`).auth(second.token, auth).send({ name: "Hijacked" }).expect(404);
    await api.delete(`/api/projects/${project._id}`).auth(second.token, auth).expect(404);
    await api.put(`/api/tasks/${task._id}`).auth(second.token, auth).send({ status: "done" }).expect(404);
    await api.delete(`/api/tasks/${task._id}`).auth(second.token, auth).expect(404);
    await api.post("/api/tasks").auth(second.token, auth).send({ title: "Intruder", projectId: project._id }).expect(404);
    await api.get(`/api/tasks?projectId=${project._id}`).auth(second.token, auth).expect(404);
});

test("update allowlists block workspace transfers, project reassignment and completion spoofing", async () => {
    const { first, second, project, task } = await setup();
    const auth = { type: "bearer" };
    for (const changes of [{ workspaceId: second.user.workspaceId }, { createdBy: second.user._id }, { $set: { name: "Bad" } }]) {
        await api.put(`/api/projects/${project._id}`).auth(first.token, auth).send(changes).expect(400);
    }
    for (const changes of [{ workspaceId: second.user.workspaceId }, { projectId: project._id }, { completedBy: second.user._id }]) {
        await api.put(`/api/tasks/${task._id}`).auth(first.token, auth).send(changes).expect(400);
    }
    assert.equal(String((await Project.findById(project._id)).workspaceId), first.user.workspaceId);
    assert.equal(String((await Task.findById(task._id)).workspaceId), first.user.workspaceId);
});

test("malformed IDs, empty names and invalid task statuses return 400", async () => {
    const { first, project, task } = await setup();
    const auth = { type: "bearer" };
    await api.put("/api/projects/not-an-id").auth(first.token, auth).send({ name: "Name" }).expect(400);
    await api.put(`/api/projects/${project._id}`).auth(first.token, auth).send({ name: "  " }).expect(400);
    await api.put(`/api/tasks/${task._id}`).auth(first.token, auth).send({ status: "invalid" }).expect(400);
    await api.post("/api/tasks").auth(first.token, auth).send({ title: "Task", projectId: "bad" }).expect(400);
    const result = await api.get(`/api/tasks?projectId=${project._id}`).auth(first.token, auth).expect(200);
    assert.equal(result.body.length, 1);
});
