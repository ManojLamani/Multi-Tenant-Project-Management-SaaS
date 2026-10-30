import { test } from "node:test";
import assert from "node:assert/strict";
import { readConfig, clientOrigins } from "../src/config/environment.js";
import { api, useDatabase } from "./helpers.js";

useDatabase();

test("configuration validates database URI, port, and production origins", () => {
    const keys = ["MONGO_URI", "PORT", "NODE_ENV", "CLIENT_ORIGINS"];
    const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    try {
        process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test";
        process.env.PORT = "5000";
        process.env.NODE_ENV = "production";
        delete process.env.CLIENT_ORIGINS;
        assert.throws(readConfig, /CLIENT_ORIGINS/);
        process.env.CLIENT_ORIGINS = "https://taskforge.example";
        assert.equal(readConfig().port, 5000);
        process.env.PORT = "invalid";
        assert.throws(readConfig, /PORT/);
        process.env.PORT = "5000";
        process.env.MONGO_URI = "https://invalid.example";
        assert.throws(readConfig, /MONGO_URI/);
        process.env.CLIENT_ORIGINS = "https://taskforge.example/path";
        assert.throws(clientOrigins, /origins/);
    } finally {
        for (const key of keys) {
            if (original[key] === undefined) delete process.env[key];
            else process.env[key] = original[key];
        }
    }
});

test("CORS only admits configured origins, while API errors stay JSON", async () => {
    const original = process.env.CLIENT_ORIGINS;
    process.env.CLIENT_ORIGINS = "http://localhost:5173";
    try {
        const response = await api.get("/api/ping").set("Origin", "http://localhost:5173").expect(200);
        assert.equal(response.headers["access-control-allow-origin"], "http://localhost:5173");
        await api.get("/api/ping").set("Origin", "https://untrusted.example").expect(403);
        const malformed = await api.post("/api/auth/login").set("Content-Type", "application/json").send('{"invalid":').expect(400);
        assert.equal(malformed.body.message, "Invalid request");
        await api.get("/api/unknown").expect(404);
        await api.post("/api/auth/login").expect(400);
        await api.post("/api/auth/register").send([]).expect(400);
        await api.get("/api/ready").expect(200);
    } finally {
        if (original === undefined) delete process.env.CLIENT_ORIGINS;
        else process.env.CLIENT_ORIGINS = original;
    }
});
