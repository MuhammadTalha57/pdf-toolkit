import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { organizePdf } from "./organize.service.js";

async function createPdfWithPages(pageCount: number): Promise<PDFDocument> {
	const pdf = await PDFDocument.create();
	for (let i = 0; i < pageCount; i += 1) {
		pdf.addPage([200, 200]);
	}
	return pdf;
}

describe("organizePdf", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("creates an organized PDF using source pages and blank pages", async () => {
		const source = await createPdfWithPages(3);

		const result = await organizePdf(source, [
			{ type: "page", sourceIndex: 2 },
			{ type: "blank" },
			{ type: "page", sourceIndex: 0 },
			{ type: "page", sourceIndex: 2 },
		]);

		expect(result).not.toBeNull();
		expect(result?.getPageCount()).toBe(4);
	});

	it("returns null when a source index is invalid", async () => {
		const source = await createPdfWithPages(2);
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const result = await organizePdf(source, [
			{ type: "page", sourceIndex: 0 },
			{ type: "page", sourceIndex: 5 },
		]);

		expect(result).toBeNull();
		expect(errorSpy).toHaveBeenCalledWith("Cannot find page at page index: 5");
	});

	it("returns an empty PDF when operations are empty", async () => {
		const source = await createPdfWithPages(2);

		const result = await organizePdf(source, []);

		expect(result).not.toBeNull();
		expect(result?.getPageCount()).toBe(0);
	});
});
