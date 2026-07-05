import {PDFDocument} from "pdf-lib"

export default async function readPDFFromURL(url: string): Promise<PDFDocument | null> {
    try {
        const response = await fetch(url);

        const arrayBuffer = await response.arrayBuffer();

        const pdfDoc = await PDFDocument.load(arrayBuffer);

        return pdfDoc;
    } catch (error) {
        console.error(`Error readin the PDF from URL: ${url}`, error);
        return null;
    }
}