import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import readPDFFromURL from "./read.service.js";

describe("readPDFFromURL", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a PDFDocument for a valid PDF response", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 200]);
    const fakePdfBytes = await pdf.save();

    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: async () => fakePdfBytes.buffer,
    } as Response);

    const doc = await readPDFFromURL("https://fake.blob/file.pdf");

    expect(doc).not.toBeNull();
    expect(doc?.getPageCount()).toBe(1);
  });

  it("returns null when fetch rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const doc = await readPDFFromURL("https://fake.blob/missing.pdf");

    expect(doc).toBeNull();
  });
});