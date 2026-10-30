import { after, before, beforeEach } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../src/app.js";

export const api = request(app);
export function useDatabase() {
    let database;
    before(async () => {
        process.env.JWT_SECRET = "test-secret-only-for-integration-tests-123456";
        database = await MongoMemoryServer.create();
        await mongoose.connect(database.getUri());
        await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    });
    beforeEach(async () => {
        await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
    });
    after(async () => {
        await mongoose.disconnect();
        await database?.stop();
    });
}

export async function createWorkspace(email = "owner@example.com") {
    const registration = await api.post("/api/auth/register").send({
        name: "Workspace owner", email, password: "password123", organizationName: "Test workspace"
    }).expect(201);
    const login = await api.post("/api/auth/login").send({ email, password: "password123" }).expect(200);
    return { user: registration.body.user, token: login.body.token };
}

export async function createMember(workspaceId, email = "member@example.com") {
    const registration = await api.post("/api/auth/register").send({
        name: "Team member", email, password: "password123", orgId: workspaceId
    }).expect(201);
    const login = await api.post("/api/auth/login").send({ email, password: "password123" }).expect(200);
    return { user: registration.body.user, token: login.body.token };
}
