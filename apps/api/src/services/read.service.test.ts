import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import readPDFFromBuffer from "./read.service.js";

describe("readPDFFromBuffer", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns a PDFDocument for valid PDF bytes", async () => {
        const pdf = await PDFDocument.create();
        pdf.addPage([200, 200]);
        const bytes = await pdf.save();

        const doc = await readPDFFromBuffer(Buffer.from(bytes));

        expect(doc).not.toBeNull();
        expect(doc?.getPageCount()).toBe(1);
    });

    it("returns null for non-PDF bytes", async () => {
        const doc = await readPDFFromBuffer(Buffer.from("not a pdf"));

        expect(doc).toBeNull();
    });
});
