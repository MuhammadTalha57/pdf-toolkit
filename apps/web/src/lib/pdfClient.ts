
import type { PDFDocumentProxy } from "pdfjs-dist";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjsLib;
    });
  }
  return pdfjsPromise;
}

export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return loadingTask.promise;
}

export async function renderPageThumbnail(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  scale = 0.35,
): Promise<string> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("This browser doesn't support canvas rendering.");
  }

  await page.render({ canvasContext: context, viewport, canvas }).promise;
  return canvas.toDataURL("image/png");
}

export async function renderAllThumbnails(
  pdf: PDFDocumentProxy,
  scale = 0.35,
): Promise<string[]> {
  const thumbnails: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    thumbnails.push(await renderPageThumbnail(pdf, pageNumber, scale));
  }
  return thumbnails;
}