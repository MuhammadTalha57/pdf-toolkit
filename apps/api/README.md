# PDF Toolkit — Backend API (`apps/api`)

An Express API that merges, splits, and reorganizes PDFs, deployed as a Vercel serverless function. Consumed by the [`apps/web`](../web/README.md) frontend, but usable from any client.

## Tech stack

- **Express 5**
- **pdf-lib** for all PDF manipulation (pure JavaScript, no native binaries — this is what makes it serverless-compatible)
- **Vercel Blob** for file storage
- **Multer** for parsing multipart uploads (in-memory, never written to disk)
- **express-rate-limit** for basic abuse protection
- **Vitest** for unit tests
- TypeScript throughout, run with `tsx`/`ts-node-dev` locally

## Architecture notes

This API is designed around two hard constraints of Vercel's serverless functions: a request/response body limit of roughly 4.5MB, and no persistent disk between invocations.

**Files are never sent as raw bytes to the merge/split/organize endpoints.** Instead, a file is uploaded once via `POST /pdf/upload`, which stores it in Vercel Blob and returns a public URL. Every other endpoint takes that URL (or URLs) as input, downloads the file server-side with `pdf-lib`, performs the transformation, uploads the result back to Blob, and returns the result's URL. This keeps the JSON bodies these endpoints deal with small regardless of how large the underlying PDF is.

**Multer uses in-memory storage**, not disk storage — there's no durable disk to write to in a serverless function, and the file only needs to exist in memory long enough to be forwarded to Blob.

## API reference

Base URL: the deployed project's Vercel URL (or `http://localhost:<port>` locally). All endpoints are mounted under `/pdf`, except `/health`.

### `GET /health`

Returns `{ "status": "ok" }`. Used to confirm the deployment is live.

### `POST /pdf/upload`

Uploads a single PDF and returns its storage URL. Every other endpoint depends on this one running first.

- **Body:** `multipart/form-data` with the file under the field name `file`.
- **Constraints:** PDF only (checked via MIME type), 4MB max.
- **200 response:**
  ```json
  { "message": "PDF uploaded successfully.", "url": "https://...blob.vercel-storage.com/..." }
  ```
- **Errors:** `400` if no file or the file isn't a PDF, `413` if it exceeds 4MB, `502` if the upload to Blob fails.

### `POST /pdf/merge`

Combines multiple PDFs, in the order given, into one file.

- **Body:**
  ```json
  { "urls": ["https://.../a.pdf", "https://.../b.pdf"] }
  ```
- **200 response:**
  ```json
  { "message": "PDFs merged and uploaded successfully.", "url": "https://..." }
  ```
- **Errors:** `400` if `urls` is missing, empty, contains a non-string/empty entry, or any URL can't be read as a PDF; `500` if the merge itself fails; `502` if uploading the result fails.

### `POST /pdf/split`

Splits a PDF into multiple output files. Each output file can be built from more than one page range — `splits` is an array of "output files", and each output file is an array of `[start, end]` page ranges (0-indexed, inclusive) to concatenate.

- **Body:**
  ```json
  {
    "url": "https://.../source.pdf",
    "splits": [
      [[0, 2]],
      [[3, 3], [5, 7]]
    ]
  }
  ```
  The example above produces two files: pages 0–2 in the first, and pages 3 plus 5–7 combined in the second.
- **200 response:**
  ```json
  { "message": "PDF split and uploaded successfully.", "urls": ["https://...", "https://..."] }
  ```
- **Errors:** `400` if `url`/`splits` are missing or malformed, or if the source PDF can't be read; `502` if uploading any result fails.

### `POST /pdf/organize`

Rebuilds a PDF from an ordered list of operations — each entry is either an existing page (referenced by its original 0-indexed position) or a new blank page. The output page order matches the order of `operations`.

- **Body:**
  ```json
  {
    "url": "https://.../source.pdf",
    "operations": [
      { "type": "page", "sourceIndex": 2 },
      { "type": "blank" },
      { "type": "page", "sourceIndex": 0 }
    ]
  }
  ```
- **200 response:**
  ```json
  { "message": "PDF organized and uploaded successfully.", "url": "https://..." }
  ```
- **Errors:** `400` if `url`/`operations` are missing or malformed, if any `page` operation has a negative or non-integer `sourceIndex`, or if the source PDF can't be read; `502` if uploading the result fails.

Page rotation is not currently supported by this endpoint.

## Directory structure

```
apps/api/
├── api/
│   └── index.ts             # Vercel's serverless entry point — re-exports the Express app
├── src/
│   ├── app.ts                # Express app: middleware, routes, error handler (no app.listen here)
│   ├── routes/
│   │   └── pdf.routes.ts
│   ├── controllers/
│   │   └── pdf.controller.ts # request validation + orchestration for all four endpoints
│   ├── services/
│   │   ├── read.service.ts    # fetches and parses a PDF from a URL
│   │   ├── merge.service.ts
│   │   ├── split.service.ts
│   │   ├── organize.service.ts
│   │   └── *.service.test.ts  # Vitest unit tests, colocated with each service
│   ├── middlewares/
│   │   ├── upload.middleware.ts  # Multer config (memory storage, PDF-only, 4MB limit)
│   │   └── error.middleware.ts   # centralized JSON error responses
│   └── utils/
│       └── blobUtils.ts       # wraps @vercel/blob's put()
├── vercel.json
├── tsconfig.json
└── package.json
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob write access. Auto-provided by Vercel when a Blob store is connected to the project; for local development, pull it with `vercel env pull` or copy it from the Vercel dashboard. |
| `FRONTEND_URL` | Yes | The frontend's origin, used to configure CORS (`cors({ origin: FRONTEND_URL })`). Set to `http://localhost:3000` locally, and to the deployed frontend's URL in production. |
| `PORT` | No | Port for the local dev server. Defaults to whatever the entry point you run specifies (see below). |

Create a `.env` file in `apps/api` for local development (not committed):

```
BLOB_READ_WRITE_TOKEN=your-token-here
FRONTEND_URL=http://localhost:3000
```

## Local development

The exported `app` in `src/app.ts` deliberately does not call `.listen()` — that's intentional, since the same app instance is reused as a serverless function handler in `api/index.ts`. To run it locally, you need a small entry point that starts an HTTP listener. If `src/server.ts` isn't already present in your checkout, add it:

```ts
// src/server.ts
import app from "./app.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
```

Then:

```bash
npm install
npm run dev     # tsx watch src/server.ts
```

## Testing

```bash
npm test        # vitest run
```

Each PDF service (`merge`, `split`, `organize`, `read`) has a colocated unit test that exercises it directly with in-memory PDFs, without going through HTTP or the network.

## Deployment

Deployed to Vercel as its own project, separate from the frontend:

- **Root Directory:** `apps/api`
- **Framework Preset:** Other
- **Environment Variables:** `BLOB_READ_WRITE_TOKEN`, `FRONTEND_URL`

This project uses an explicit `vercel.json` rather than relying on Vercel's zero-config Express detection:

```json
{
  "version": 2,
  "builds": [{ "src": "api/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "api/index.ts" }]
}
```

This tells Vercel exactly what to build and how to route every request to it, which avoids ambiguity in a Turborepo-managed monorepo where framework auto-detection has otherwise picked the wrong build behavior for this project.

## Known limitations

- No authentication — every endpoint is open to whoever has the URL, subject only to the rate limiter.
- No persistence — nothing is written to a database. `mongoose` is a listed dependency in `package.json` in anticipation of a future per-user history feature, but no models or connection exist yet.
- No page rotation in the organize endpoint.
- 4MB per-file upload limit, set below Vercel's serverless request body cap.