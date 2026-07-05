"use client";

import { useState } from "react";
import { Plus, Download, RotateCcw } from "lucide-react";
import Dropzone from "@/components/DropZone";
import PageThumbnail from "@/components/PageThumbnail";
import Spinner from "@/components/Spinner";
import { loadPdfDocument, renderAllThumbnails } from "@/lib/pdfClient";
import { organizePDF, uploadPDF, type OrganizeOp } from "@/lib/api";
import { downloadFile } from "@/lib/download";

type PageItem =
  | { id: string; kind: "page"; sourceIndex: number; thumbnail: string }
  | { id: string; kind: "blank" };

export default function OrganizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(files: File[]) {
    const selected = files[0];
    setError(null);
    setFile(selected);
    setIsPreviewing(true);
    try {
      const pdf = await loadPdfDocument(selected);
      const thumbnails = await renderAllThumbnails(pdf);
      setPages(
        thumbnails.map((thumbnail, index) => ({
          id: crypto.randomUUID(),
          kind: "page",
          sourceIndex: index,
          thumbnail,
        })),
      );
    } catch {
      setError("Couldn't read that PDF. Try a different file.");
      setFile(null);
    } finally {
      setIsPreviewing(false);
    }
  }

  function reorder(fromIndex: number, toIndex: number) {
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function removePage(id: string) {
    setPages((prev) => prev.filter((page) => page.id !== id));
  }

  function addBlankPage() {
    setPages((prev) => [...prev, { id: crypto.randomUUID(), kind: "blank" }]);
  }

  async function handleOrganize() {
    if (!file) return;
    setStatus("working");
    setError(null);
    try {
      const operations: OrganizeOp[] = pages.map((page) =>
        page.kind === "blank"
          ? { type: "blank" }
          : { type: "page", sourceIndex: page.sourceIndex },
      );
      const url = await uploadPDF(file);
      const organized = await organizePDF(url, operations);
      setResultUrl(organized);
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong organizing the file.",
      );
      setStatus("idle");
    }
  }

  function reset() {
    setFile(null);
    setPages([]);
    setResultUrl(null);
    setStatus("idle");
    setError(null);
  }

  if (status === "done" && resultUrl) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl italic text-ink">
          Your reorganized PDF is ready
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {pages.length} page{pages.length === 1 ? "" : "s"} in the new file.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => downloadFile(resultUrl, "organized.pdf")}
            className="transition-standard inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-medium text-white hover:bg-accent/90"
          >
            <Download size={16} /> Download
          </button>
          <button
            onClick={reset}
            className="transition-standard inline-flex items-center gap-2 rounded-full border border-line px-6 py-2.5 font-medium text-ink hover:border-ink"
          >
            <RotateCcw size={16} /> Organize another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-4xl italic text-ink">Organize pages</h1>
      <p className="mt-2 text-ink-soft">
        Drag pages to reorder, remove the ones you don&apos;t need, or insert a
        blank page.
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

      {file && pages.length >= 0 && !isPreviewing && (
        <>
          <div className="mt-8 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {pages.map((page, index) => (
              <div
                key={page.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== index) {
                    reorder(dragIndex, index);
                  }
                  setDragIndex(null);
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <PageThumbnail
                  src={page.kind === "page" ? page.thumbnail : ""}
                  label={page.kind === "blank" ? "Blank" : `${index + 1}`}
                  isBlank={page.kind === "blank"}
                  onRemove={() => removePage(page.id)}
                />
              </div>
            ))}

            <button
              onClick={addBlankPage}
              className="transition-standard flex aspect-3/4 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-ink-soft hover:border-accent hover:text-accent"
            >
              <Plus size={20} />
              <span className="text-xs">Blank page</span>
            </button>
          </div>

          {pages.length === 0 && (
            <p className="mt-4 text-sm text-ink-soft">
              Add at least one page to build a PDF.
            </p>
          )}

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={handleOrganize}
              disabled={pages.length === 0 || status === "working"}
              className="transition-standard rounded-full bg-accent px-6 py-2.5 font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save changes
            </button>
            {status === "working" && <Spinner label="Organizing…" />}
          </div>
        </>
      )}
    </div>
  );
}