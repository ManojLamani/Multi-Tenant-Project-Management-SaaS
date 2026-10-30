export function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim().length < 32) {
        throw new Error("JWT_SECRET must contain at least 32 non-whitespace characters");
    }
    return secret;
}
