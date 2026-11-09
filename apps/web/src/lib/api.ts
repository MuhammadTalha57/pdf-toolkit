const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

async function parseErrorMessage(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === "string") return body.error;
    } catch {
        // Response wasn't JSON.
    }
    return `Request failed with status ${response.status}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        credentials: "include",
        ...init,
    });

    if (!response.ok) {
        throw new ApiError(await parseErrorMessage(response), response.status);
    }

    return (await response.json()) as T;
}

function jsonRequest(body: unknown): RequestInit {
    return {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}

export type User = {
    id: string;
    email: string;
};

export async function signup(email: string, password: string): Promise<User> {
    const data = await request<{ user: User }>("/auth/signup", jsonRequest({ email, password }));
    return data.user;
}

export async function login(email: string, password: string): Promise<User> {
    const data = await request<{ user: User }>("/auth/login", jsonRequest({ email, password }));
    return data.user;
}

export async function logout(): Promise<void> {
    await request<{ message: string }>("/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<User> {
    const data = await request<{ user: User }>("/auth/me");
    return data.user;
}

export type OrganizeOp = { type: "page"; sourceIndex: number } | { type: "blank" };

export type UploadedDocument = {
    documentId: string;
    fileName: string;
    pageCount: number;
};

export async function uploadPDF(file: File): Promise<UploadedDocument> {
    const formData = new FormData();
    formData.append("file", file);

    return request<UploadedDocument>("/pdf/upload", {
        method: "POST",
        body: formData,
    });
}

export async function uploadPDFs(files: File[]): Promise<UploadedDocument[]> {
    return Promise.all(files.map((file) => uploadPDF(file)));
}

export type OperationResult = {
    documentId: string;
    fileName: string;
    pageCount?: number;
};

export async function mergePDFs(documentIds: string[]): Promise<OperationResult> {
    return request<OperationResult>("/pdf/merge", jsonRequest({ documentIds }));
}

export type SplitResult = {
    documentIds: string[];
    fileNames: string[];
};

export async function splitPDF(
    documentId: string,
    splits: [number, number][][],
): Promise<SplitResult> {
    return request<SplitResult>("/pdf/split", jsonRequest({ documentId, splits }));
}

export async function organizePDF(
    documentId: string,
    operations: OrganizeOp[],
): Promise<OperationResult> {
    return request<OperationResult>("/pdf/organize", jsonRequest({ documentId, operations }));
}

export type DocumentKind = "upload" | "merge" | "split" | "organize";

export type DocumentSummary = {
    id: string;
    kind: DocumentKind;
    originalName: string;
    sizeBytes: number;
    pageCount: number | null;
    createdAt: string;
};

export async function listDocuments(): Promise<DocumentSummary[]> {
    const data = await request<{ documents: DocumentSummary[] }>("/documents");
    return data.documents;
}

export function documentDownloadUrl(documentId: string): string {
    return `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/download`;
}
