import { test } from "node:test";
import assert from "node:assert/strict";
import Invitation from "../src/models/Invitation.js";
import User from "../src/models/User.js";
import { hashInvitation } from "../src/utils/invitations.js";
import { api, createMember, createWorkspace, useDatabase } from "./helpers.js";

useDatabase();
const auth = { type: "bearer" };
const join = (token, email = "invitee@example.com") => api.post("/api/auth/register").send({ name: "Invitee", email, password: "password123", inviteToken: token, role: "owner" });
async function invite(owner, email = "invitee@example.com") {
    const response = await api.post("/api/invitations").auth(owner.token, auth).send({ email }).expect(201);
    assert.match(response.headers["cache-control"], /no-store/);
    return response.body;
}

test("owners create email-bound invites; raw tokens and hashes are not exposed in listing", async () => {
    const owner = await createWorkspace();
    const result = await invite(owner, " Invitee@Example.com ");
    assert.match(result.token, /^[a-f0-9]{64}$/);
    assert.equal(result.invitation.email, "invitee@example.com");
    assert.equal(result.invitation.tokenHash, undefined);
    const stored = await Invitation.findById(result.invitation._id).select("+tokenHash");
    assert.equal(stored.tokenHash, hashInvitation(result.token));
    assert.notEqual(stored.tokenHash, result.token);
    const list = await api.get("/api/invitations").auth(owner.token, auth).expect(200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].tokenHash, undefined);
    assert.equal(list.body[0].token, undefined);
    assert.match(list.headers["cache-control"], /no-store/);
    const registration = await join(result.token, "INVITEE@example.com").expect(201);
    assert.equal(registration.body.user.workspaceId, owner.user.workspaceId);
    assert.equal(registration.body.user.role, "member");
    assert.equal(registration.body.user.password, undefined);
    assert.equal((await Invitation.findById(stored._id)).status, "accepted");
    await join(result.token).expect(400);
    await api.post("/api/invitations").auth(owner.token, auth).send({ email: "INVITEE@example.com" }).expect(409);
});

test("wrong email, invalid codes, and legacy workspace-ID joins are rejected", async () => {
    const owner = await createWorkspace();
    const { token, invitation } = await invite(owner);
    await join(token, "someone-else@example.com").expect(400);
    await join("invalid").expect(400);
    await api.post("/api/auth/register").send({ name: "Uninvited", email: "other@example.com", password: "password123", orgId: owner.user.workspaceId }).expect(400);
    assert.equal((await Invitation.findById(invitation._id)).status, "pending");
    assert.equal(await User.countDocuments(), 1);
});

test("expired and revoked invitations cannot be accepted", async () => {
    const owner = await createWorkspace();
    const expired = await invite(owner);
    await Invitation.updateOne({ _id: expired.invitation._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    await join(expired.token).expect(400);
    const revoked = await invite(owner, "revoked@example.com");
    await api.delete(`/api/invitations/${revoked.invitation._id}`).auth(owner.token, auth).expect(204);
    await join(revoked.token, "revoked@example.com").expect(400);
});

test("reissuing an invitation revokes the previous link", async () => {
    const owner = await createWorkspace();
    const first = await invite(owner);
    const second = await invite(owner);
    assert.notEqual(first.token, second.token);
    await join(first.token).expect(400);
    await join(second.token).expect(201);
    assert.equal((await Invitation.findById(first.invitation._id)).status, "revoked");
});

test("only owners manage their own workspace's invitations", async () => {
    const owner = await createWorkspace();
    const other = await createWorkspace("other@example.com");
    const member = await createMember(owner);
    const { invitation } = await invite(owner);
    await api.get("/api/invitations").expect(401);
    await api.get("/api/invitations").auth(member.token, auth).expect(403);
    await api.post("/api/invitations").auth(member.token, auth).send({ email: "no@example.com" }).expect(403);
    await api.delete(`/api/invitations/${invitation._id}`).auth(member.token, auth).expect(403);
    await api.put(`/api/users/${member.user._id}/role`).auth(owner.token, auth).send({ role: "manager" }).expect(200);
    await api.get("/api/invitations").auth(member.token, auth).expect(403);
    await api.post("/api/invitations").auth(member.token, auth).send({ email: "no@example.com" }).expect(403);
    await api.delete(`/api/invitations/${invitation._id}`).auth(member.token, auth).expect(403);
    await api.delete(`/api/invitations/${invitation._id}`).auth(other.token, auth).expect(404);
    const list = await api.get("/api/invitations").auth(other.token, auth).expect(200);
    assert.deepEqual(list.body, []);
    await api.post("/api/invitations").auth(owner.token, auth).send({ email: "bad" }).expect(400);
    await api.post("/api/invitations").auth(owner.token, auth).send({ email: "valid@example.com", role: "owner" }).expect(400);
    await api.delete("/api/invitations/not-an-id").auth(owner.token, auth).expect(400);
});

test("failed account creation rolls back invitation consumption", async t => {
    const owner = await createWorkspace();
    const { token, invitation } = await invite(owner);
    t.mock.method(User, "create", async () => { throw new Error("Simulated account failure"); });
    await join(token).expect(500);
    assert.equal((await Invitation.findById(invitation._id)).status, "pending");
    assert.equal(await User.countDocuments({ email: "invitee@example.com" }), 0);
});

test("concurrent acceptance creates exactly one member", async () => {
    const owner = await createWorkspace();
    const { token, invitation } = await invite(owner);
    const results = await Promise.all([join(token), join(token)]);
    assert.equal(results.filter(result => result.status === 201).length, 1);
    assert.ok(results.some(result => [400, 409].includes(result.status)));
    assert.equal(await User.countDocuments({ email: "invitee@example.com" }), 1);
    assert.equal((await Invitation.findById(invitation._id)).status, "accepted");
});
