import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import mergePDFs from "./merge.service.js";

async function createPdfWithPages(pageCount: number): Promise<PDFDocument> {
	const pdf = await PDFDocument.create();
	for (let i = 0; i < pageCount; i += 1) {
		pdf.addPage([200, 200]);
	}
	return pdf;
}

describe("mergePDFs", () => {
	it("merges pages from all PDFs and returns a merged document", async () => {
		const pdf1 = await createPdfWithPages(1);
		const pdf2 = await createPdfWithPages(2);

		const result = await mergePDFs([pdf1, pdf2]);

		expect(result).not.toBeNull();
		expect(result?.getPageCount()).toBe(3);
	});

	it("returns a document with pages from a single input PDF", async () => {
		const pdf1 = await createPdfWithPages(1);

		const result = await mergePDFs([pdf1]);

		expect(result).not.toBeNull();
		expect(result?.getPageCount()).toBe(1);
	});

	it("returns an empty PDF when no URLs are provided", async () => {
		const result = await mergePDFs([]);

		expect(result).not.toBeNull();
		expect(result?.getPageCount()).toBe(1);
	});
});
