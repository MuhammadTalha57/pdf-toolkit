import { PDFDocument } from "pdf-lib";


export async function splitPdf(pdf: PDFDocument, splits: [number, number][][]): Promise<PDFDocument[] | null> {
    let result: PDFDocument[] = [];
    for(const split of splits) {
        const pdfDoc = await PDFDocument.create();
        for(const [a, b] of split) {
            if(a < 0 || b >= pdf.getPageCount() || a > b) {
                console.error(`Can't split pdf from page ${a} to ${b}`);
                return null;
            }
    
            const copiedPages = await  pdfDoc.copyPages(pdf, Array.from({length: b - a  + 1}, (_, i) => a + i));

            for(const page of copiedPages) {
                pdfDoc.addPage(page);
            }
        }

        result.push(pdfDoc);
    }
    
    return result;
}