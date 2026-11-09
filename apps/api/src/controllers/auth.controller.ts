import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { signToken, verifyPassword, hashPassword } from "../services/auth.service.js";
import { clearAuthCookie, setAuthCookie } from "../services/cookie.service.js";

const CredentialsSchema = z.object({
    email: z.string().email().max(320),
    password: z.string().min(8).max(200),
});

type UserRow = {
    id: string;
    email: string;
    password_hash: string;
};

type PublicUser = {
    id: string;
    email: string;
    created_at?: string;
};

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
    );
}

export async function handleSignup(req: Request, res: Response): Promise<void> {
    const parsed = CredentialsSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({
            error: "Provide a valid email and a password of at least 8 characters.",
        });
        return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const id = randomUUID();
    const passwordHash = await hashPassword(parsed.data.password);

    try {
        await query(
            "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)",
            [id, email, passwordHash],
        );
    } catch (error) {
        if (isUniqueViolation(error)) {
            res.status(409).json({ error: "An account with this email already exists." });
            return;
        }
        throw error;
    }

    const token = await signToken(id);
    setAuthCookie(res, token);

    res.status(201).json({ user: { id, email } satisfies PublicUser });
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
    const parsed = CredentialsSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({
            error: "Provide a valid email and a password of at least 8 characters.",
        });
        return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const result = await query<UserRow>(
        "SELECT id, email, password_hash FROM users WHERE lower(email) = $1",
        [email],
    );
    const user = result.rows[0];

    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
    }

    const token = await signToken(user.id);
    setAuthCookie(res, token);

    res.status(200).json({ user: { id: user.id, email: user.email } satisfies PublicUser });
}

export async function handleLogout(_req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    res.status(200).json({ message: "Logged out." });
}

export async function handleMe(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    const result = await query<PublicUser>(
        "SELECT id, email, created_at FROM users WHERE id = $1",
        [req.userId],
    );
    const user = result.rows[0];

    if (!user) {
        res.status(401).json({ error: "Session user not found." });
        return;
    }

    res.status(200).json({ user });
}
