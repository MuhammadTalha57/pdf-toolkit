import { PDFDocument } from "pdf-lib";
import readPDFFromURL from "./read.service.js";


export default async function mergedPDFsFromURLs(urls: string[]): Promise<PDFDocument | null> {
    const mergedPdf = await PDFDocument.create();
    for(const url of urls) {
        const pdfDoc = await readPDFFromURL(url);
        if(!pdfDoc) {
            console.error(`Failed to fetch pdf from ${url}`);
            return null;
        }

        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

        copiedPages.forEach((page) => mergedPdf.addPage(page));


    }

    await mergedPdf.save();

    return mergedPdf;
}