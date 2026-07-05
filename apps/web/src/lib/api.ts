

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if(!API_BASE_URL) {
    console.warn("NEXT_PUBLIC_API_BASE_URL is not set. API calls will fail until it is configured.");
}


async function parseErrorMessage(response: Response): Promise<string> {
    try {
        const body = await response.json();
        if(typeof body?.error === "string") return body.error;
    } catch(error) {
        // Response wasn't json
    }
    return `Request failed with status ${response.status}`;
}


export type OrganizeOp = {type: "page", sourceIndex: number} | {type: "blank"};


export async function uploadPDF(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    console.log(API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/pdf/upload`, {
        method: "POST",
        body: formData,
    });

    if(!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    const data = (await response.json()) as {url: string};
    return data.url;
}


export async function uploadPDFs(files: File[]): Promise<string[]> {
    return Promise.all(files.map((file)=> uploadPDF(file)));
}


export async function mergePDFs(urls: string[]): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/pdf/merge`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({urls}),
    });

    if(!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    const data = (await response.json()) as {url: string};
    return data.url;
}


export async function splitPDF(url: string, splits: [number, number][][]): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/pdf/split`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url, splits}),
    })

    if(!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    const data = (await response.json()) as {urls: string[]};
    return data.urls;
}

export async function organizePDF(url: string, operations: OrganizeOp[]): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/pdf/organize`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url, operations}),
    });


    if(!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }
    
    const data = (await response.json()) as {url: string};
    return data.url;
}