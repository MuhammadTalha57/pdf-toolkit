import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../db/pool.js", () => ({ query }));

import { getDocumentForUser } from "./document.service.js";

const VALID_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("getDocumentForUser", () => {
    beforeEach(() => {
        query.mockReset();
    });

    it("returns null without querying for malformed ids", async () => {
        const result = await getDocumentForUser("not-a-uuid", "user-1");

        expect(result).toBeNull();
        expect(query).not.toHaveBeenCalled();
    });

    it("queries the database for a valid uuid", async () => {
        query.mockResolvedValue({ rows: [{ id: VALID_ID }], rowCount: 1 });

        const result = await getDocumentForUser(VALID_ID, "user-1");

        expect(query).toHaveBeenCalledWith(
            "SELECT * FROM documents WHERE id = $1 AND user_id = $2",
            [VALID_ID, "user-1"],
        );
        expect(result).toEqual({ id: VALID_ID });
    });
});
