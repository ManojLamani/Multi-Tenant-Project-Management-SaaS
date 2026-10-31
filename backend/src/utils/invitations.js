import { createHash, randomBytes } from "node:crypto";
import { InputError } from "./validation.js";

export function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validEmail(value) {
    return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function hashInvitation(token) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
        throw new InputError("A valid invitation code is required to join a workspace");
    }
    return createHash("sha256").update(token.toLowerCase()).digest("hex");
}

export function newInvitation() {
    const token = randomBytes(32).toString("hex");
    return { token, tokenHash: hashInvitation(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
}
