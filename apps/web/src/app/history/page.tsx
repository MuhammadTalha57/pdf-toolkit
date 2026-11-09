"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import AuthGate from "@/components/auth/AuthGate";
import Spinner from "@/components/Spinner";
import { listDocuments, type DocumentSummary } from "@/lib/api";
import { downloadDocument } from "@/lib/download";

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function HistoryContent() {
    const [documents, setDocuments] = useState<DocumentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        listDocuments()
            .then((nextDocuments) => {
                if (active) setDocuments(nextDocuments);
            })
            .catch((err: unknown) => {
                if (active) {
                    setError(err instanceof Error ? err.message : "Could not load your history.");
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    if (loading) {
        return <Spinner label="Loading your documents…" />;
    }

    if (error) {
        return <p className="text-sm text-danger">{error}</p>;
    }

    if (documents.length === 0) {
        return (
            <p className="text-ink-soft">
                No generated PDFs yet. Use a tool and the result will appear here.
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-2">
            {documents.map((document) => (
                <li
                    key={document.id}
                    className="paper-corner flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3"
                >
                    <span className="flex-1 truncate text-sm text-ink">
                        {document.originalName}
                    </span>
                    <span className="font-mono text-xs uppercase text-accent">{document.kind}</span>
                    <span className="font-mono text-xs text-ink-soft">
                        {document.pageCount ?? "—"} pg
                    </span>
                    <span className="font-mono text-xs text-ink-soft">
                        {formatBytes(document.sizeBytes)}
                    </span>
                    <span className="font-mono text-xs text-ink-soft">
                        {new Date(document.createdAt).toLocaleDateString()}
                    </span>
                    <button
                        onClick={() => void downloadDocument(document.id, document.originalName)}
                        className="transition-standard inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                    >
                        <Download size={14} /> Download
                    </button>
                </li>
            ))}
        </ul>
    );
}

export default function HistoryPage() {
    return (
        <div className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="font-display text-4xl italic text-ink">Your documents</h1>
            <p className="mt-2 text-ink-soft">
                PDFs you have generated with the toolkit.
            </p>
            <div className="mt-8">
                <AuthGate>
                    <HistoryContent />
                </AuthGate>
            </div>
        </div>
    );
}
