import { PDFDocument } from "pdf-lib";

export default async function readPDFFromBuffer(
    buffer: Buffer | Uint8Array,
): Promise<PDFDocument | null> {
    try {
        return await PDFDocument.load(buffer);
    } catch (error) {
        console.error("Error reading PDF from buffer:", error);
        return null;
    }
}
