import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { splitPdf } from "./split.service.js";

async function createPdfWithPages(pageCount: number): Promise<PDFDocument> {
	const pdf = await PDFDocument.create();
	for (let i = 0; i < pageCount; i += 1) {
		pdf.addPage([200, 200]);
	}
	return pdf;
}

describe("splitPdf", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("creates new PDFs from nested split ranges", async () => {
		const source = await createPdfWithPages(9);

		const result = await splitPdf(source, [
			[
				[1, 3],
				[6, 8],
			],
			[[5, 8]],
		]);

		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
		expect(result?.[0]?.getPageCount()).toBe(6);
		expect(result?.[1]?.getPageCount()).toBe(4);
	});

	it("returns null when a split range is invalid", async () => {
		const source = await createPdfWithPages(5);
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const result = await splitPdf(source, [
			[[0, 2]],
			[[4, 6]],
		]);

		expect(result).toBeNull();
		expect(errorSpy).toHaveBeenCalledWith("Can't split pdf from page 4 to 6");
	});

	it("returns an empty result when no splits are provided", async () => {
		const source = await createPdfWithPages(3);

		const result = await splitPdf(source, []);

		expect(result).toEqual([]);
	});
});
