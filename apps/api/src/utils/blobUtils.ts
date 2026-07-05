import {put} from "@vercel/blob"

export async function uploadBlob(file: File) {
    console.log({
        name: file.name,
        size: file.size,
        type: file.type,
        constructor: file.constructor.name,
    });
    try {
        const blob = await put(file.name, file, {access: 'public', addRandomSuffix: true, token: process.env.BLOB_READ_WRITE_TOKEN || ""});

        return blob;
    } catch(error) {
        console.error(`Upload failed:`, error);
        throw error;
    }
}