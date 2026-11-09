import { documentDownloadUrl } from "./api";

function saveBlob(blob: Blob, fileName: string) {
    const objectURL = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(objectURL);
}

export async function downloadFile(url: string, fileName: string) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Could not download the file. Try again in a moment.");
    }

    saveBlob(await response.blob(), fileName);
}

export async function downloadDocument(
    documentId: string,
    fallbackName = "document.pdf",
): Promise<void> {
    const response = await fetch(documentDownloadUrl(documentId), {
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Could not download the file. Try again in a moment.");
    }

    saveBlob(await response.blob(), fallbackName);
}
