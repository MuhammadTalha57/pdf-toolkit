import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import mergedPDFsFromURLs from "./merge.service.js";
import readPDFFromURL from "./read.service.js";

vi.mock("./read.service.js", () => ({
	default: vi.fn(),
}));

async function createPdfWithPages(pageCount: number): Promise<PDFDocument> {
	const pdf = await PDFDocument.create();
	for (let i = 0; i < pageCount; i += 1) {
		pdf.addPage([200, 200]);
	}
	return pdf;
}

describe("mergedPDFsFromURLs", () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it("merges pages from all PDFs and returns a merged document", async () => {
		const pdf1 = await createPdfWithPages(1);
		const pdf2 = await createPdfWithPages(2);

		vi.mocked(readPDFFromURL)
			.mockResolvedValueOnce(pdf1)
			.mockResolvedValueOnce(pdf2);

		const result = await mergedPDFsFromURLs([
			"https://example.com/one.pdf",
			"https://example.com/two.pdf",
		]);

		expect(result).not.toBeNull();
		expect(result?.getPageCount()).toBe(3);
		expect(readPDFFromURL).toHaveBeenCalledTimes(2);
	});

	it("returns null when one PDF cannot be read", async () => {
		const pdf1 = await createPdfWithPages(1);
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		vi.mocked(readPDFFromURL)
			.mockResolvedValueOnce(pdf1)
			.mockResolvedValueOnce(null);

		const result = await mergedPDFsFromURLs([
			"https://example.com/one.pdf",
			"https://example.com/missing.pdf",
		]);

		expect(result).toBeNull();
		expect(readPDFFromURL).toHaveBeenCalledTimes(2);
		expect(errorSpy).toHaveBeenCalledWith(
			"Failed to fetch pdf from https://example.com/missing.pdf",
		);
	});

	it("returns an empty PDF when no URLs are provided", async () => {
		const result = await mergedPDFsFromURLs([]);

		expect(result).not.toBeNull();
		expect(result?.getPageCount()).toBe(1);
		expect(readPDFFromURL).not.toHaveBeenCalled();
	});
});
