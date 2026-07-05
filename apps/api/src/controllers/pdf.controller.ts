import type {Request, Response} from "express";
import { PDFDocument } from "pdf-lib";
import readPDFFromURL from "../services/read.service.js";
import mergePDFs from "../services/merge.service.js";
import { uploadBlob } from "../utils/blobUtils.js";

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

    const mergedBytes = await merged.save();
    const mergedBuffer = Buffer.from(mergedBytes);
    const mergedFile = new File([mergedBuffer], `merged-${Date.now()}.pdf`, {
        type: "application/pdf",
    });
    try {

        const blob = await uploadBlob(mergedFile);
    
        return res.status(200).json({
            message: "PDFs merged and uploaded successfully.",
            url: blob.url,
        });
    } catch (error) {
        console.error("PDF upload failed", error);
        return res.status(502).json({
            error: "Failed to upload merged PDF.",
        });
    }
}