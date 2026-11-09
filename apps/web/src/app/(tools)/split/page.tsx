"use client";

import { useState } from "react";
import { Plus, X, Download, RotateCcw } from "lucide-react";
import Dropzone from "@/components/DropZone";
import PageThumbnail from "@/components/PageThumbnail";
import Spinner from "@/components/Spinner";
import AuthGate from "@/components/auth/AuthGate";
import { loadPdfDocument, renderAllThumbnails } from "@/lib/pdfClient";
import { parsePageRanges } from "@/lib/ranges";
import { splitPDF, uploadPDF, type SplitResult } from "@/lib/api";
import { downloadDocument } from "@/lib/download";

type OutputRow = { id: string; rangeText: string };

export default function SplitPage() {
    const [file, setFile] = useState<File | null>(null);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [rows, setRows] = useState<OutputRow[]>([
        { id: crypto.randomUUID(), rangeText: "" },
    ]);
    const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
    const [result, setResult] = useState<SplitResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleFileSelected(files: File[]) {
        const selected = files[0];
        setError(null);
        setFile(selected);
        setIsPreviewing(true);
        try {
            const pdf = await loadPdfDocument(selected);
            const rendered = await renderAllThumbnails(pdf);
            setThumbnails(rendered);
        } catch {
            setError("Couldn't read that PDF. Try a different file.");
            setFile(null);
        } finally {
            setIsPreviewing(false);
        }
    }

    function updateRow(id: string, rangeText: string) {
        setRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, rangeText } : row)),
        );
    }

    function addRow() {
        setRows((prev) => [...prev, { id: crypto.randomUUID(), rangeText: "" }]);
    }

    function removeRow(id: string) {
        setRows((prev) => prev.filter((row) => row.id !== id));
    }

    async function handleSplit() {
        if (!file) return;
        setError(null);

        let splits: [number, number][][];
        try {
            splits = rows.map((row) =>
                parsePageRanges(row.rangeText, thumbnails.length),
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid page range.");
            return;
        }

        setStatus("working");
        try {
            const upload = await uploadPDF(file);
            const splitResult = await splitPDF(upload.documentId, splits);
            setResult(splitResult);
            setStatus("done");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong splitting the file.",
            );
            setStatus("idle");
        }
    }

    function reset() {
        setFile(null);
        setThumbnails([]);
        setRows([{ id: crypto.randomUUID(), rangeText: "" }]);
        setResult(null);
        setStatus("idle");
        setError(null);
    }

    if (status === "done" && result) {
        return (
            <AuthGate>
                <div className="mx-auto max-w-xl px-6 py-20 text-center">
                    <h1 className="font-display text-3xl italic text-ink">
                        Your files are ready
                    </h1>
                    <p className="mt-2 text-sm text-ink-soft">
                        {result.documentIds.length} file
                        {result.documentIds.length === 1 ? "" : "s"} created.
                    </p>
                    <ul className="mt-8 flex flex-col gap-2 text-left">
                        {result.documentIds.map((documentId, index) => {
                            const fileName = result.fileNames[index] ?? `part-${index + 1}.pdf`;
                            return (
                                <li
                                    key={documentId}
                                    className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3"
                                >
                                    <span className="font-mono text-sm text-ink">{fileName}</span>
                                    <button
                                        onClick={() => void downloadDocument(documentId, fileName)}
                                        className="transition-standard inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                                    >
                                        <Download size={14} /> Download
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <button
                        onClick={reset}
                        className="transition-standard mt-8 inline-flex items-center gap-2 rounded-full border border-line px-6 py-2.5 font-medium text-ink hover:border-ink"
                    >
                        <RotateCcw size={16} /> Split another file
                    </button>
                </div>
            </AuthGate>
        );
    }

    return (
        <AuthGate>
            <div className="mx-auto max-w-3xl px-6 py-16">
                <h1 className="font-display text-4xl italic text-ink">Split a PDF</h1>
                <p className="mt-2 text-ink-soft">
                    Add a file, then describe which pages go into each output file.
                </p>

                {!file && (
                    <div className="mt-8">
                        <Dropzone onFilesSelected={handleFileSelected} />
                    </div>
                )}

                {isPreviewing && (
                    <div className="mt-8">
                        <Spinner label="Reading pages…" />
                    </div>
                )}

                {file && thumbnails.length > 0 && (
                    <>
                        <div className="mt-8 grid grid-cols-4 gap-3 sm:grid-cols-6">
                            {thumbnails.map((src, index) => (
                                <PageThumbnail key={index} src={src} label={`${index + 1}`} />
                            ))}
                        </div>

                        <div className="mt-10">
                            <h2 className="font-medium text-ink">Output files</h2>
                            <p className="mt-1 text-sm text-ink-soft">
                                e.g. <span className="font-mono">1-3, 7</span> for pages 1
                                through 3 and page 7 in one file.
                            </p>
                            <div className="mt-4 flex flex-col gap-3">
                                {rows.map((row, index) => (
                                    <div key={row.id} className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-ink-soft">
                                            File {index + 1}
                                        </span>
                                        <input
                                            value={row.rangeText}
                                            onChange={(e) => updateRow(row.id, e.target.value)}
                                            placeholder="1-3, 7"
                                            className="transition-standard flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                                        />
                                        {rows.length > 1 && (
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                aria-label="Remove output file"
                                                className="text-ink-soft hover:text-danger"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={addRow}
                                className="transition-standard mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                            >
                                <Plus size={14} /> Add another output file
                            </button>
                        </div>

                        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

                        <div className="mt-8 flex items-center gap-4">
                            <button
                                onClick={handleSplit}
                                disabled={status === "working"}
                                className="transition-standard rounded-full bg-accent px-6 py-2.5 font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Split
                            </button>
                            {status === "working" && <Spinner label="Splitting…" />}
                        </div>
                    </>
                )}
            </div>
        </AuthGate>
    );
}
