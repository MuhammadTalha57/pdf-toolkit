import { PDFDocument } from "pdf-lib";


type OrganizeOp = {type: "page", sourceIndex: number} | {type: "blank"};

export async function organizePdf(pdf: PDFDocument, operations: OrganizeOp[]): Promise<PDFDocument | null> {
    const organizedPdf = await PDFDocument.create();

    for(const op of operations) {
        if(op.type === "blank") {
            organizedPdf.addPage();
        } else {
            const p = op.sourceIndex;
            if(p < 0 || p >= pdf.getPageCount()) {
                console.error(`Cannot find page at page index: ${p}`);
                return null;
            }

            const copiedPages = await organizedPdf.copyPages(pdf, [p]);
            copiedPages.forEach((page) => organizedPdf.addPage(page))
        }
    }

    return organizedPdf;
}