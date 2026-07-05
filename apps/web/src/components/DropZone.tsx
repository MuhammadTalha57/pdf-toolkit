"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // stays under Vercel's serverless body limit

type DropzoneProps = {
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  label?: string;
};

export default function Dropzone({
  multiple = false,
  onFilesSelected,
  label,
}: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);
      const nonPdf = files.find((f) => f.type !== "application/pdf");
      if (nonPdf) {
        setError(`"${nonPdf.name}" isn't a PDF file.`);
        return;
      }

      const tooLarge = files.find((f) => f.size > MAX_FILE_SIZE_BYTES);
      if (tooLarge) {
        setError(
          `"${tooLarge.name}" is over the 4MB limit for this demo. Try a smaller file.`,
        );
        return;
      }

      setError(null);
      onFilesSelected(multiple ? files : [files[0]]);
    },
    [multiple, onFilesSelected],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`transition-standard flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center ${
          isDragActive
            ? "border-accent bg-accent-soft"
            : "border-line bg-surface hover:border-accent/50"
        }`}
      >
        <UploadCloud
          size={32}
          strokeWidth={1.5}
          className={isDragActive ? "text-accent" : "text-ink-soft"}
        />
        <div>
          <p className="font-medium text-ink">
            {label ??
              (multiple
                ? "Drop PDFs here, or click to browse"
                : "Drop a PDF here, or click to browse")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Up to 4MB per file · PDF only
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}