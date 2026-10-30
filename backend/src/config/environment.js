import { getJwtSecret } from "./auth.js";

export function clientOrigins() {
    const origins = process.env.CLIENT_ORIGINS || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173,http://127.0.0.1:5173");
    if (!origins) throw new Error("CLIENT_ORIGINS is required in production");
    return origins.split(",").map(value => {
        const url = new URL(value.trim());
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
            throw new Error("CLIENT_ORIGINS must contain only HTTP(S) origins");
        }
        return url.origin;
    });
}

export function readConfig() {
    getJwtSecret();
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri || !/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) throw new Error("MONGO_URI must be a MongoDB connection string");
    const port = Number(process.env.PORT || 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 to 65535");
    clientOrigins();
    return { mongoUri, port };
}
