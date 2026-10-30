import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import { getJwtSecret } from "../src/config/auth.js";
import { api, createWorkspace, useDatabase } from "./helpers.js";

useDatabase();

test("registration, login and profile never expose password hashes", async () => {
    const { user, token } = await createWorkspace(" Owner@Example.com ");
    assert.equal(user.email, "owner@example.com");
    assert.equal(user.password, undefined);
    const stored = await User.findById(user._id).select("+password");
    assert.match(stored.password, /^\$2/);
    const login = await api.post("/api/auth/login").send({ email: "OWNER@example.com", password: "password123" }).expect(200);
    assert.equal(login.body.user.password, undefined);
    const profile = await api.get("/api/auth/me").auth(token, { type: "bearer" }).expect(200);
    assert.equal(profile.body.user.password, undefined);
});

test("invalid login, missing tokens, and expired tokens are rejected", async () => {
    const { user } = await createWorkspace();
    await api.post("/api/auth/login").send({ email: user.email, password: "wrong" }).expect(401);
    await api.get("/api/auth/me").expect(401);
    const token = jwt.sign({ userId: user._id }, getJwtSecret(), { expiresIn: -1 });
    await api.get("/api/auth/me").auth(token, { type: "bearer" }).expect(401);
});

test("JWT configuration cannot fall back to a known secret", () => {
    const original = process.env.JWT_SECRET;
    try {
        delete process.env.JWT_SECRET;
        assert.throws(getJwtSecret, /JWT_SECRET/);
        process.env.JWT_SECRET = "too-short";
        assert.throws(getJwtSecret, /JWT_SECRET/);
    } finally {
        process.env.JWT_SECRET = original;
    }
});

test("registration rejects weak or malformed credentials and duplicate emails", async () => {
    await api.post("/api/auth/register").send({ name: "Owner", email: "invalid", password: "short", organizationName: "Team" }).expect(400);
    await createWorkspace();
    await api.post("/api/auth/register").send({ name: "Duplicate", email: "OWNER@example.com", password: "password123", organizationName: "Team" }).expect(400);
});
