import {put} from "@vercel/blob"

export async function uploadBlob(file: File) {
    try {
        const blob = await put(file.name, file, {access: 'public', addRandomSuffix: true,});

        return blob;
    } catch(error) {
        console.error(`Upload failed:`, error);
        throw error;
    }
}