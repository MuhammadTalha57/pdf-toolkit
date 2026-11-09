import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./auth.service.js";

beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-at-least-16-characters";
    process.env.JWT_EXPIRES_DAYS = "7";
});

describe("password hashing", () => {
    it("verifies the original password and rejects a wrong one", async () => {
        const hash = await hashPassword("correct horse battery staple");

        expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
        expect(await verifyPassword("wrong password", hash)).toBe(false);
    });
});

describe("JWT tokens", () => {
    it("round-trips the user id", async () => {
        const token = await signToken("user-123");

        expect(await verifyToken(token)).toBe("user-123");
    });

    it("returns null for a tampered token", async () => {
        const token = await signToken("user-123");

        expect(await verifyToken(`${token}x`)).toBeNull();
    });
});
