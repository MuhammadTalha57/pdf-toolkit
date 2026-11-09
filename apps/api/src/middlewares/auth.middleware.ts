import type { RequestHandler } from "express";
import { AUTH_COOKIE, verifyToken } from "../services/auth.service.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
    const token = req.cookies?.[AUTH_COOKIE] as string | undefined;

    if (!token) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    const userId = await verifyToken(token);

    if (!userId) {
        res.status(401).json({ error: "Invalid or expired session." });
        return;
    }

    req.userId = userId;
    next();
};
