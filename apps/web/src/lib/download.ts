export async function downloadFile(url: string, fileName: string) {
    const response = await fetch(url);
    if(!response.ok) {
        throw new Error("Could not download the file. Try again in a moment.");
    }
    
    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(objectURL);
}