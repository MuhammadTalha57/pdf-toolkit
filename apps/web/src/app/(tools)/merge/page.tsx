"use client";

import { useState } from "react";
import { GripVertical, FileText, X, Download, RotateCcw } from "lucide-react";
import Dropzone from "@/components/DropZone";
import Spinner from "@/components/Spinner";
import { mergePDFs, uploadPDFs } from "@/lib/api";
import { downloadFile } from "@/lib/download";

type QueuedFile = { id: string; file: File };

export default function MergePage() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addFiles(files: File[]) {
    setError(null);
    setQueue((prev) => [
      ...prev,
      ...files.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
  }

  function removeFile(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  function reorder(fromIndex: number, toIndex: number) {
    setQueue((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function handleMerge() {
    setStatus("working");
    setError(null);
    try {
      const urls = await uploadPDFs(queue.map((item) => item.file));
      const merged = await mergePDFs(urls);
      setResultUrl(merged);
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong merging your files.",
      );
      setStatus("idle");
    }
  }

  function reset() {
    setQueue([]);
    setResultUrl(null);
    setStatus("idle");
    setError(null);
  }

  if (status === "done" && resultUrl) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl italic text-ink">
          Your merged PDF is ready
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {queue.length} files combined into one document.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => downloadFile(resultUrl, "merged.pdf")}
            className="transition-standard inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-medium text-white hover:bg-accent/90"
          >
            <Download size={16} /> Download
          </button>
          <button
            onClick={reset}
            className="transition-standard inline-flex items-center gap-2 rounded-full border border-line px-6 py-2.5 font-medium text-ink hover:border-ink"
          >
            <RotateCcw size={16} /> Merge more files
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl italic text-ink">Merge PDFs</h1>
      <p className="mt-2 text-ink-soft">
        Add two or more files, drag to set the order, then merge.
      </p>

      <div className="mt-8">
        <Dropzone multiple onFilesSelected={addFiles} />
      </div>

      {queue.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {queue.map((item, index) => (
            <li
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) {
                  reorder(dragIndex, index);
                }
                setDragIndex(null);
              }}
              className="paper-corner transition-standard flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3"
            >
              <GripVertical size={16} className="cursor-grab text-ink-soft" />
              <FileText size={16} className="text-accent" />
              <span className="flex-1 truncate text-sm text-ink">
                {item.file.name}
              </span>
              <span className="font-mono text-xs text-ink-soft">
                {(item.file.size / 1024).toFixed(0)} KB
              </span>
              <button
                onClick={() => removeFile(item.id)}
                aria-label={`Remove ${item.file.name}`}
                className="text-ink-soft hover:text-danger"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleMerge}
          disabled={queue.length < 2 || status === "working"}
          className="transition-standard rounded-full bg-accent px-6 py-2.5 font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Merge {queue.length > 0 ? `${queue.length} files` : ""}
        </button>
        {status === "working" && <Spinner label="Merging…" />}
        {queue.length === 1 && (
          <p className="text-sm text-ink-soft">Add one more file to merge.</p>
        )}
      </div>
    </div>
  );
}