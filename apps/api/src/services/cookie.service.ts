import type { Response } from "express";
import { getEnv, useSecureCookies } from "../config/env.js";
import { AUTH_COOKIE } from "./auth.service.js";

export function setAuthCookie(res: Response, token: string): void {
    const maxAge = getEnv().JWT_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

    res.cookie(AUTH_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: useSecureCookies(),
        path: "/",
        maxAge,
    });
}

export function clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE, { path: "/" });
}
