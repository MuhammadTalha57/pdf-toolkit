import { PDFDocument } from "pdf-lib"; 


export default async function mergedPDFs(pdfs: PDFDocument[]): Promise<PDFDocument | null> {
    const mergedPdf = await PDFDocument.create();
    for(const pdf of pdfs) {

        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    await mergedPdf.save();

    return mergedPdf;
}