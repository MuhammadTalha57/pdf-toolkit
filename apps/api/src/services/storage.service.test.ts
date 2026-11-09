import { describe, expect, it } from "vitest";
import { resultKey, tempKey } from "./storage.service.js";

describe("storage keys", () => {
    it("places transient uploads under tmp/", () => {
        expect(tempKey()).toMatch(/^tmp\/[0-9a-f-]+\.pdf$/);
    });

    it("scopes results to the owning user", () => {
        expect(resultKey("user-123")).toMatch(/^users\/user-123\/results\/[0-9a-f-]+\.pdf$/);
    });
});
