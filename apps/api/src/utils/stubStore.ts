const store = new Map<string, Buffer>();

export function isStubMode(): boolean {
    return process.env.BLOB_STUB === "1";
}

export async function putStub(file: File): Promise<{ url: string; key: string }> {
    const key = crypto.randomUUID();
    store.set(key, Buffer.from(await file.arrayBuffer()));
    const origin = `http://localhost:${process.env.PORT ?? 4000}`;
    return { url: `${origin}/pdf/file?url=${key}`, key };
}

export function getStub(key: string): Buffer | undefined {
    return store.get(key);
}

export function replaceStub(key: string, bytes: Buffer): boolean {
    if (!store.has(key)) return false;
    store.set(key, bytes);
    return true;
}

export function deleteStub(key: string): boolean {
    return store.delete(key);
}
