import type { Request, Response } from "express";
import { getDocumentForUser, listReadyDocuments } from "../services/document.service.js";
import { getObjectStream } from "../services/storage.service.js";

export async function handleListDocuments(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    const documents = await listReadyDocuments(req.userId);

    res.status(200).json({
        documents: documents.map((doc) => ({
            id: doc.id,
            kind: doc.kind,
            originalName: doc.original_name,
            sizeBytes: Number(doc.size_bytes),
            pageCount: doc.page_count,
            createdAt: doc.created_at,
        })),
    });
}

export async function handleDownloadDocument(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    const id = req.params.id;

    if (typeof id !== "string" || id.length === 0) {
        res.status(400).json({ error: "Document id is required." });
        return;
    }

    const document = await getDocumentForUser(id, req.userId);

    if (!document || document.status !== "ready") {
        res.status(404).json({ error: "Document not found." });
        return;
    }

    const stream = await getObjectStream(document.s3_key);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(document.original_name)}"`,
    );
    res.setHeader("Content-Length", document.size_bytes);

    stream.on("error", (error) => {
        console.error("Failed to stream document", document.id, error);
        res.destroy(error);
    });

    stream.pipe(res);
}
