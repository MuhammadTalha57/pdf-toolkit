import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "../config/env.js";

const encoder = new TextEncoder();

export const AUTH_COOKIE = "pdf_token";

export async function hashPassword(password: string): Promise<string> {
    return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
}

export async function signToken(userId: string): Promise<string> {
    const env = getEnv();

    return new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(`${env.JWT_EXPIRES_DAYS}d`)
        .sign(encoder.encode(env.JWT_SECRET));
}

export async function verifyToken(token: string): Promise<string | null> {
    try {
        const env = getEnv();
        const { payload } = await jwtVerify(token, encoder.encode(env.JWT_SECRET));
        return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
        return null;
    }
}
