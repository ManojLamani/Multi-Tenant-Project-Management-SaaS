import { test } from "node:test";
import assert from "node:assert/strict";
import Project from "../src/models/Project.js";
import Task from "../src/models/Task.js";
import Activity from "../src/models/Activity.js";
import User from "../src/models/User.js";
import { api, createWorkspace, useDatabase } from "./helpers.js";

useDatabase();
const auth = { type: "bearer" };
const archive = (owner, id, archived = true) => api.put(`/api/projects/${id}/archive`).auth(owner.token, auth).send({ archived });
async function setup() {
    const owner = await createWorkspace();
    const project = (await api.post("/api/projects").auth(owner.token, auth).send({ name: "Release" }).expect(201)).body;
    const task = (await api.post("/api/tasks").auth(owner.token, auth).send({ title: "Ship release", projectId: project._id }).expect(201)).body;
    return { owner, project, task };
}
async function teammate(owner, role) {
    // Seed roles directly: these tests exercise project permissions, not enrollment.
    const source = await User.findById(owner.user._id).select("+password");
    const user = await User.create({ name: role, email: `${role}@example.com`, password: source.password, role, workspaceId: owner.user.workspaceId });
    const login = await api.post("/api/auth/login").send({ email: user.email, password: "password123" }).expect(200);
    return { user, token: login.body.token };
}

test("archive and restore preserve tasks and history while filtering project lists", async () => {
    const { owner, project, task } = await setup();
    const result = await archive(owner, project._id).expect(200);
    assert.ok(Date.parse(result.body.archivedAt));
    assert.deepEqual((await api.get("/api/projects").auth(owner.token, auth).expect(200)).body, []);
    for (const archived of ["true", "all"]) {
        const list = await api.get("/api/projects").query({ archived }).auth(owner.token, auth).expect(200);
        assert.deepEqual(list.body.map(item => item._id), [project._id]);
    }
    const tasks = await api.get("/api/tasks").query({ projectId: project._id }).auth(owner.token, auth).expect(200);
    assert.equal(tasks.body[0]._id, task._id);
    const events = await api.get(`/api/projects/${project._id}/activity`).auth(owner.token, auth).expect(200);
    assert.equal(events.body.length, 1);
    assert.equal((await archive(owner, project._id, false).expect(200)).body.archivedAt, null);
    assert.equal((await api.get("/api/projects").auth(owner.token, auth).expect(200)).body.length, 1);
    await api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send({ status: "done" }).expect(200);
    assert.equal(await Activity.countDocuments({ projectId: project._id }), 2);
});

test("archived projects reject project edits and every task mutation without side effects", async () => {
    const { owner, project, task } = await setup();
    const member = await teammate(owner, "member");
    await archive(owner, project._id).expect(200);
    const readable = await api.get("/api/projects?archived=true").auth(member.token, auth).expect(200);
    assert.equal(readable.body[0]._id, project._id);
    await api.get("/api/tasks").query({ projectId: project._id }).auth(member.token, auth).expect(200);
    await api.get(`/api/projects/${project._id}/activity`).auth(member.token, auth).expect(200);
    await api.put(`/api/projects/${project._id}`).auth(owner.token, auth).send({ name: "Changed" }).expect(409);
    await api.post("/api/tasks").auth(owner.token, auth).send({ title: "New task", projectId: project._id }).expect(409);
    await api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send({ title: "Changed" }).expect(409);
    await api.put(`/api/tasks/${task._id}`).auth(member.token, auth).send({ status: "done" }).expect(409);
    await api.delete(`/api/tasks/${task._id}`).auth(owner.token, auth).expect(409);
    assert.equal((await Project.findById(project._id)).name, "Release");
    assert.equal((await Task.findById(task._id)).status, "todo");
    assert.equal(await Task.countDocuments({ projectId: project._id }), 1);
    assert.equal(await Activity.countDocuments({ projectId: project._id }), 1);
    await archive(owner, project._id, false).expect(200);
    await api.put(`/api/projects/${project._id}`).auth(owner.token, auth).send({ name: "Changed" }).expect(200);
    await api.put(`/api/tasks/${task._id}`).auth(member.token, auth).send({ status: "done" }).expect(200);
    await api.delete(`/api/tasks/${task._id}`).auth(owner.token, auth).expect(200);
    await api.post("/api/tasks").auth(owner.token, auth).send({ title: "New task", projectId: project._id }).expect(201);
});

test("archive permissions and validation enforce workspace boundaries", async () => {
    const { owner, project } = await setup();
    const member = await teammate(owner, "member");
    const manager = await teammate(owner, "manager");
    const other = await createWorkspace("other@example.com");
    await api.put(`/api/projects/${project._id}/archive`).send({ archived: true }).expect(401);
    await archive(member, project._id).expect(403);
    await archive(other, project._id).expect(404);
    await archive(manager, project._id).expect(200);
    await archive(member, project._id, false).expect(403);
    await archive(other, project._id, false).expect(404);
    assert.deepEqual((await api.get("/api/projects?archived=all").auth(other.token, auth).expect(200)).body, []);
    await api.get("/api/tasks").query({ projectId: project._id }).auth(other.token, auth).expect(404);
    await api.get(`/api/projects/${project._id}/activity`).auth(other.token, auth).expect(404);
    await archive(manager, project._id, false).expect(200);
    for (const body of [{}, { archived: "true" }, { archived: true, workspaceId: other.user.workspaceId }]) {
        await api.put(`/api/projects/${project._id}/archive`).auth(owner.token, auth).send(body).expect(400);
    }
    await archive(owner, "invalid").expect(400);
    await api.get("/api/projects?archived=anything").auth(owner.token, auth).expect(400);
    await api.get("/api/projects?archived=true&archived=false").auth(owner.token, auth).expect(400);
});

test("legacy projects without archive metadata remain active; owners can permanently delete archived projects", async () => {
    const { owner, project } = await setup();
    await Project.collection.updateOne({ _id: (await Project.findById(project._id))._id }, { $unset: { archivedAt: "" } });
    assert.equal((await api.get("/api/projects").auth(owner.token, auth).expect(200)).body.length, 1);
    await archive(owner, project._id).expect(200);
    await archive(owner, project._id).expect(200);
    await api.delete(`/api/projects/${project._id}`).auth(owner.token, auth).expect(200);
    assert.equal(await Task.countDocuments({ projectId: project._id }), 0);
    assert.equal(await Activity.countDocuments({ projectId: project._id }), 0);
    await archive(owner, project._id, false).expect(404);
});

for (const operation of ["create", "update", "delete"]) {
    test(`archiving during task ${operation} prevents the in-flight mutation from committing`, { timeout: 15000 }, async t => {
        const { owner, project, task } = await setup();
        let release;
        let entered;
        const gate = new Promise(resolve => { release = resolve; });
        const waiting = new Promise(resolve => { entered = resolve; });
        const original = Project.updateOne;
        let first = true;
        t.mock.method(Project, "updateOne", function (...args) {
            if (!first) return Reflect.apply(original, this, args);
            first = false;
            entered();
            return gate.then(() => Reflect.apply(original, this, args));
        });
        const request = operation === "create" ? api.post("/api/tasks").auth(owner.token, auth).send({ title: "Race", projectId: project._id })
            : operation === "update" ? api.put(`/api/tasks/${task._id}`).auth(owner.token, auth).send({ status: "done" })
                : api.delete(`/api/tasks/${task._id}`).auth(owner.token, auth);
        const pending = request.then(response => response);
        await waiting;
        try { await archive(owner, project._id).expect(200); }
        finally { release(); }
        assert.equal((await pending).status, 409);
        assert.equal((await Task.findById(task._id)).status, "todo");
        assert.equal(await Task.countDocuments({ projectId: project._id }), 1);
        assert.equal(await Activity.countDocuments({ projectId: project._id }), 1);
    });
}
