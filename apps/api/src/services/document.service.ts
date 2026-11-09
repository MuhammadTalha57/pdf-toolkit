import { randomUUID } from "node:crypto";
import { query } from "../db/pool.js";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DocumentKind = "upload" | "merge" | "split" | "organize";
export type DocumentStatus = "temp" | "ready";

export type DocumentRecord = {
    id: string;
    user_id: string;
    kind: DocumentKind;
    original_name: string;
    s3_key: string;
    size_bytes: string;
    page_count: number | null;
    status: DocumentStatus;
    operation: unknown;
    created_at: string;
    expires_at: string | null;
};

export type CreateDocumentInput = {
    userId: string;
    kind: DocumentKind;
    originalName: string;
    s3Key: string;
    sizeBytes: number;
    pageCount?: number | null;
    status: DocumentStatus;
    operation?: unknown;
    expiresAt?: Date | null;
};

export async function createDocument(input: CreateDocumentInput): Promise<DocumentRecord> {
    const result = await query<DocumentRecord>(
        `INSERT INTO documents
            (id, user_id, kind, original_name, s3_key, size_bytes, page_count, status, operation, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
            randomUUID(),
            input.userId,
            input.kind,
            input.originalName,
            input.s3Key,
            input.sizeBytes,
            input.pageCount ?? null,
            input.status,
            input.operation ?? null,
            input.expiresAt ?? null,
        ],
    );

    return result.rows[0] as DocumentRecord;
}

export async function getDocumentForUser(
    id: string,
    userId: string,
): Promise<DocumentRecord | null> {
    if (!UUID_PATTERN.test(id)) return null;

    const result = await query<DocumentRecord>(
        "SELECT * FROM documents WHERE id = $1 AND user_id = $2",
        [id, userId],
    );

    return result.rows[0] ?? null;
}

export async function listReadyDocuments(userId: string): Promise<DocumentRecord[]> {
    const result = await query<DocumentRecord>(
        `SELECT id, kind, original_name, size_bytes, page_count, status, created_at
         FROM documents
         WHERE user_id = $1 AND status = 'ready'
         ORDER BY created_at DESC`,
        [userId],
    );

    return result.rows;
}

export async function deleteDocumentRow(id: string): Promise<void> {
    await query("DELETE FROM documents WHERE id = $1", [id]);
}
