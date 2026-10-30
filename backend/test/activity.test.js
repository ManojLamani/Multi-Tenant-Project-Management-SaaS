import { test } from "node:test";
import assert from "node:assert/strict";
import Activity from "../src/models/Activity.js";
import Task from "../src/models/Task.js";
import { api, createWorkspace, useDatabase } from "./helpers.js";

useDatabase();
const auth = { type: "bearer" };

test("activity records task creation, field changes and deletion with workspace isolation", async () => {
    const owner = await createWorkspace();
    const outsider = await createWorkspace("outsider@example.com");
    const project = (await api.post("/api/projects").auth(owner.token, auth).send({ name: "Project" })).body;
    const task = (await api.post("/api/tasks").auth(owner.token, auth).send({ title: "Plan launch", projectId: project._id }).expect(201)).body;
    await api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send({ status: "done" }).expect(200);
    await api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send({ status: "done" }).expect(200);
    await api.delete(`/api/tasks/${task._id}`).auth(owner.token, auth).expect(200);
    const history = await api.get(`/api/projects/${project._id}/activity`).auth(owner.token, auth).expect(200);
    assert.deepEqual(history.body.map(event => event.action), ["deleted", "updated", "created"]);
    assert.equal(history.body[0].actor._id, owner.user._id);
    assert.ok(history.body[1].changes.some(change => change.field === "status" && change.from === "todo" && change.to === "done"));
    await api.get(`/api/projects/${project._id}/activity`).auth(outsider.token, auth).expect(404);
    await api.get(`/api/projects/${project._id}/activity`).expect(401);
    await api.delete(`/api/projects/${project._id}`).auth(owner.token, auth).expect(200);
    assert.equal(await Activity.countDocuments({ projectId: project._id }), 0);
});

test("task changes roll back when writing their activity record fails", async t => {
    const owner = await createWorkspace();
    const project = (await api.post("/api/projects").auth(owner.token, auth).send({ name: "Project" })).body;
    const task = (await api.post("/api/tasks").auth(owner.token, auth).send({ title: "Before", projectId: project._id }).expect(201)).body;
    t.mock.method(Activity, "create", async () => { throw new Error("Simulated activity failure"); });
    await api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send({ title: "After" }).expect(500);
    assert.equal((await Task.findById(task._id)).title, "Before");
    assert.equal(await Activity.countDocuments(), 1);
});
