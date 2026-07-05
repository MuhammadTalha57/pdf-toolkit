import type {Request, Response} from "express";
import { PDFDocument } from "pdf-lib";
import readPDFFromURL from "../services/read.service.js";
import mergePDFs from "../services/merge.service.js";
import { organizePdf } from "../services/organize.service.js";
import { splitPdf } from "../services/split.service.js";
import { uploadBlob } from "../utils/blobUtils.js";

type OrganizeOp = { type: "page"; sourceIndex: number } | { type: "blank" };

async function uploadPdfDocument(pdf: PDFDocument, filePrefix: string): Promise<string> {
    const bytes = await pdf.save();
    const file = new File([bytes as BlobPart], `${filePrefix}-${Date.now()}.pdf`, {
        type: "application/pdf",
    });
    const blob = await uploadBlob(file);
    return blob.url;
}

export const handleUploadPdf = async (req: Request, res: Response) => {
    const file = req.file;

    if (!file) {
        return res.status(400).json({
            error: "Invalid request: PDF file is required in 'file' field.",
        });
    }

    if (file.mimetype !== "application/pdf") {
        return res.status(400).json({
            error: "Invalid request: only PDF files are allowed.",
        });
    }

    const safeName = (file.originalname || "uploaded.pdf").endsWith(".pdf")
        ? file.originalname
        : `${file.originalname || "uploaded"}.pdf`;

    // const uploadFile = new File([file.buffer], safeName, {
    //     type: "application/pdf",
    // });

    const uploadFile = new File([file.buffer as BlobPart], `${safeName}-${Date.now()}.pdf`, {
        type: "application/pdf",
    });

    try {
        const blob = await uploadBlob(uploadFile);
        return res.status(200).json({
            message: "PDF uploaded successfully.",
            url: blob.url,
        });
    } catch (error) {
        console.error("PDF upload failed", error);
        return res.status(502).json({
            error: "Failed to upload PDF.",
        });
    }
};



export const handleMergePdfs = async (req: Request, res: Response) => {
	const { urls } = req.body as { urls?: string[] };
    if (!Array.isArray(urls)) {
        return res.status(400).json({
            error: "Invalid request: 'urls' is required and must be an array of strings.",
        });
    }

    if (urls.length === 0) {
        return res.status(400).json({
            error: "Incomplete request: provide at least one URL.",
        });
    }

    const hasInvalidUrl = urls.some(
        (url) => typeof url !== "string" || url.trim().length === 0,
    );

    if (hasInvalidUrl) {
        return res.status(400).json({
            error: "Invalid request: every URL must be a non-empty string.",
        });
    }

    const loaded = await Promise.all(urls.map((url) => readPDFFromURL(url)));
    const hasReadFailure = loaded.some((doc) => doc === null);

    if (hasReadFailure) {
        return res.status(400).json({
            error: "One or more PDFs could not be read from the provided URLs.",
        });
    }

    const pdfs: PDFDocument[] = loaded.filter(
        (doc): doc is PDFDocument => doc !== null,
    );

    const merged = await mergePDFs(pdfs);

    if (!merged) {
        return res.status(500).json({
            error: "Failed to merge PDFs.",
        });
    }

    try {
        const url = await uploadPdfDocument(merged, "merged");
    
        return res.status(200).json({
            message: "PDFs merged and uploaded successfully.",
            url,
        });
    } catch (error) {
        console.error("PDF upload failed", error);
        return res.status(502).json({
            error: "Failed to upload merged PDF.",
        });
    }
};

export const handleOrganizePdf = async (req: Request, res: Response) => {
    const { url, operations } = req.body as { url?: string; operations?: OrganizeOp[] };

    if (typeof url !== "string" || url.trim().length === 0) {
        return res.status(400).json({
            error: "Invalid request: 'url' is required and must be a non-empty string.",
        });
    }

    if (!Array.isArray(operations)) {
        return res.status(400).json({
            error: "Invalid request: 'operations' is required and must be an array.",
        });
    }

    const hasInvalidOp = operations.some((op) => {
        if (!op || typeof op !== "object" || !("type" in op)) {
            return true;
        }

        if (op.type === "blank") {
            return false;
        }

        if (op.type === "page") {
            return !Number.isInteger(op.sourceIndex) || op.sourceIndex < 0;
        }

        return true;
    });

    if (hasInvalidOp) {
        return res.status(400).json({
            error: "Invalid request: each operation must be { type: 'blank' } or { type: 'page', sourceIndex: number }.",
        });
    }

    const sourcePdf = await readPDFFromURL(url);
    if (!sourcePdf) {
        return res.status(400).json({
            error: "Could not read PDF from the provided URL.",
        });
    }

    const organized = await organizePdf(sourcePdf, operations);
    if (!organized) {
        return res.status(400).json({
            error: "Failed to organize PDF with the provided operations.",
        });
    }

    try {
        const organizedUrl = await uploadPdfDocument(organized, "organized");
        return res.status(200).json({
            message: "PDF organized and uploaded successfully.",
            url: organizedUrl,
        });
    } catch (error) {
        console.error("Organized PDF upload failed", error);
        return res.status(502).json({
            error: "Failed to upload organized PDF.",
        });
    }
};

export const handleSplitPdf = async (req: Request, res: Response) => {
    const { url, splits } = req.body as { url?: string; splits?: [number, number][][] };

    if (typeof url !== "string" || url.trim().length === 0) {
        return res.status(400).json({
            error: "Invalid request: 'url' is required and must be a non-empty string.",
        });
    }

    if (!Array.isArray(splits)) {
        return res.status(400).json({
            error: "Invalid request: 'splits' is required and must be an array.",
        });
    }

    const hasInvalidSplitShape = splits.some(
        (split) =>
            !Array.isArray(split) ||
            split.some(
                (range) =>
                    !Array.isArray(range) ||
                    range.length !== 2 ||
                    !Number.isInteger(range[0]) ||
                    !Number.isInteger(range[1]),
            ),
    );

    if (hasInvalidSplitShape) {
        return res.status(400).json({
            error: "Invalid request: 'splits' must match [[[start, end], ...], ...] with integer indices.",
        });
    }

    const sourcePdf = await readPDFFromURL(url);
    if (!sourcePdf) {
        return res.status(400).json({
            error: "Could not read PDF from the provided URL.",
        });
    }

    const splitDocs = await splitPdf(sourcePdf, splits);
    if (!splitDocs) {
        return res.status(400).json({
            error: "Failed to split PDF with the provided ranges.",
        });
    }

    try {
        const urls = await Promise.all(
            splitDocs.map((doc, i) => uploadPdfDocument(doc, `split-${i + 1}`)),
        );
        return res.status(200).json({
            message: "PDF split and uploaded successfully.",
            urls,
        });
    } catch (error) {
        console.error("Split PDF upload failed", error);
        return res.status(502).json({
            error: "Failed to upload one or more split PDFs.",
        });
    }
};