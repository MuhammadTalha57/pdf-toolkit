import type { Request, Response } from "express";
import type { PDFDocument } from "pdf-lib";
import readPDFFromBuffer from "../services/read.service.js";
import mergePDFs from "../services/merge.service.js";
import { organizePdf } from "../services/organize.service.js";
import { splitPdf } from "../services/split.service.js";
import {
    createDocument,
    deleteDocumentRow,
    getDocumentForUser,
    type DocumentRecord,
} from "../services/document.service.js";
import {
    deleteObject,
    getObjectBuffer,
    putObject,
    resultKey,
    tempKey,
} from "../services/storage.service.js";

type OrganizeOp = { type: "page"; sourceIndex: number } | { type: "blank" };

const TEMP_TTL_MS = 24 * 60 * 60 * 1000;

function baseName(name: string): string {
    const withoutExtension = name.replace(/\.pdf$/i, "");
    return withoutExtension.length > 0 ? withoutExtension : "document";
}

function isStringArray(value: unknown): value is string[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((entry) => typeof entry === "string" && entry.trim().length > 0)
    );
}

async function storeResultDocument(input: {
    userId: string;
    kind: "merge" | "split" | "organize";
    originalName: string;
    pdf: PDFDocument;
    operation: unknown;
}): Promise<DocumentRecord> {
    const bytes = Buffer.from(await input.pdf.save());
    const key = resultKey(input.userId);

    await putObject(key, bytes);

    return createDocument({
        userId: input.userId,
        kind: input.kind,
        originalName: input.originalName,
        s3Key: key,
        sizeBytes: bytes.byteLength,
        pageCount: input.pdf.getPageCount(),
        status: "ready",
        operation: input.operation,
    });
}

async function cleanupTempDocument(document: DocumentRecord): Promise<void> {
    if (document.status !== "temp") return;

    try {
        await deleteObject(document.s3_key);
        await deleteDocumentRow(document.id);
    } catch (error) {
        console.error("Failed to clean up temporary document", document.id, error);
    }
}

async function loadOwnedDocument(
    documentId: string,
    userId: string,
): Promise<{ document: DocumentRecord; pdf: PDFDocument } | null> {
    const document = await getDocumentForUser(documentId, userId);

    if (!document) return null;

    const buffer = await getObjectBuffer(document.s3_key);
    const pdf = await readPDFFromBuffer(buffer);

    if (!pdf) return null;

    return { document, pdf };
}

export const handleUploadPdf = async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    const file = req.file;

    if (!file) {
        res.status(400).json({
            error: "Invalid request: PDF file is required in 'file' field.",
        });
        return;
    }

    if (file.mimetype !== "application/pdf") {
        res.status(400).json({
            error: "Invalid request: only PDF files are allowed.",
        });
        return;
    }

    const pdf = await readPDFFromBuffer(file.buffer);

    if (!pdf) {
        res.status(400).json({
            error: "Invalid request: the uploaded file is not a readable PDF.",
        });
        return;
    }

    const safeName = file.originalname.endsWith(".pdf")
        ? file.originalname
        : `${file.originalname || "uploaded"}.pdf`;

    const key = tempKey();
    await putObject(key, file.buffer);

    const document = await createDocument({
        userId: req.userId,
        kind: "upload",
        originalName: safeName,
        s3Key: key,
        sizeBytes: file.size,
        pageCount: pdf.getPageCount(),
        status: "temp",
        expiresAt: new Date(Date.now() + TEMP_TTL_MS),
    });

    res.status(200).json({
        message: "PDF uploaded successfully.",
        documentId: document.id,
        fileName: safeName,
        pageCount: pdf.getPageCount(),
    });
};

export const handleMergePdfs = async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    const { documentIds } = req.body as { documentIds?: unknown };

    if (!isStringArray(documentIds)) {
        res.status(400).json({
            error: "Invalid request: 'documentIds' must be a non-empty array of document ids.",
        });
        return;
    }

    const loaded = await Promise.all(
        documentIds.map((id) => loadOwnedDocument(id, req.userId as string)),
    );

    if (loaded.some((entry) => entry === null)) {
        res.status(400).json({
            error: "One or more documents could not be read.",
        });
        return;
    }

    const documents = loaded.filter(
        (entry): entry is { document: DocumentRecord; pdf: PDFDocument } => entry !== null,
    );

    const merged = await mergePDFs(documents.map((entry) => entry.pdf));

    if (!merged) {
        res.status(500).json({ error: "Failed to merge PDFs." });
        return;
    }

    const result = await storeResultDocument({
        userId: req.userId,
        kind: "merge",
        originalName: "merged.pdf",
        pdf: merged,
        operation: { documentIds },
    });

    await Promise.all(documents.map((entry) => cleanupTempDocument(entry.document)));

    res.status(200).json({
        message: "PDFs merged successfully.",
        documentId: result.id,
        fileName: result.original_name,
        pageCount: merged.getPageCount(),
    });
};

export const handleOrganizePdf = async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    const { documentId, operations } = req.body as {
        documentId?: unknown;
        operations?: unknown;
    };

    if (typeof documentId !== "string" || documentId.length === 0) {
        res.status(400).json({
            error: "Invalid request: 'documentId' is required and must be a non-empty string.",
        });
        return;
    }

    if (!Array.isArray(operations)) {
        res.status(400).json({
            error: "Invalid request: 'operations' is required and must be an array.",
        });
        return;
    }

    const hasInvalidOperation = operations.some((operation) => {
        if (typeof operation !== "object" || operation === null) return true;
        const candidate = operation as { type?: unknown; sourceIndex?: unknown };
        if (candidate.type === "blank") return false;
        return (
            candidate.type !== "page" ||
            !Number.isInteger(candidate.sourceIndex) ||
            (candidate.sourceIndex as number) < 0
        );
    });

    if (hasInvalidOperation) {
        res.status(400).json({
            error: "Invalid request: 'operations' must contain page or blank entries.",
        });
        return;
    }

    const loaded = await loadOwnedDocument(documentId, req.userId);

    if (!loaded) {
        res.status(400).json({
            error: "Could not read the requested document.",
        });
        return;
    }

    const organized = await organizePdf(loaded.pdf, operations as OrganizeOp[]);

    if (!organized) {
        res.status(400).json({
            error: "Failed to organize PDF with the provided operations.",
        });
        return;
    }

    const result = await storeResultDocument({
        userId: req.userId,
        kind: "organize",
        originalName: `${baseName(loaded.document.original_name)}-organized.pdf`,
        pdf: organized,
        operation: { documentId, operations },
    });

    await cleanupTempDocument(loaded.document);

    res.status(200).json({
        message: "PDF organized successfully.",
        documentId: result.id,
        fileName: result.original_name,
        pageCount: organized.getPageCount(),
    });
};

export const handleSplitPdf = async (req: Request, res: Response): Promise<void> => {
    if (!req.userId) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    const { documentId, splits } = req.body as {
        documentId?: unknown;
        splits?: unknown;
    };

    if (typeof documentId !== "string" || documentId.length === 0) {
        res.status(400).json({
            error: "Invalid request: 'documentId' is required and must be a non-empty string.",
        });
        return;
    }

    if (!Array.isArray(splits)) {
        res.status(400).json({
            error: "Invalid request: 'splits' is required and must be an array.",
        });
        return;
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
        res.status(400).json({
            error: "Invalid request: 'splits' must match [[[start, end], ...], ...] with integer indices.",
        });
        return;
    }

    const loaded = await loadOwnedDocument(documentId, req.userId);

    if (!loaded) {
        res.status(400).json({
            error: "Could not read the requested document.",
        });
        return;
    }

    const splitDocs = await splitPdf(loaded.pdf, splits as [number, number][][]);

    if (!splitDocs) {
        res.status(400).json({
            error: "Failed to split PDF with the provided ranges.",
        });
        return;
    }

    const base = baseName(loaded.document.original_name);
    const results = await Promise.all(
        splitDocs.map((doc, index) =>
            storeResultDocument({
                userId: req.userId as string,
                kind: "split",
                originalName: `${base}-part-${index + 1}.pdf`,
                pdf: doc,
                operation: { documentId, index },
            }),
        ),
    );

    await cleanupTempDocument(loaded.document);

    res.status(200).json({
        message: "PDF split successfully.",
        documentIds: results.map((result) => result.id),
        fileNames: results.map((result) => result.original_name),
    });
};
