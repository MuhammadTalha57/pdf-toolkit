# PDF Toolkit

A small, focused set of PDF tools — merge, split, and reorganize pages — built as a monorepo with a Next.js frontend and an Express backend deployed as serverless functions on Vercel. Built as a portfolio project to demonstrate a production-shaped MERN stack (MongoDB is reserved for a future feature; see [Known limitations](#known-limitations)).

**Live app:** https://pdf-toolkit-web-orcin.vercel.app/

## What it does

- **Merge** — combine multiple PDFs into one, in an order you choose.
- **Split** — extract page ranges from a PDF into one or more new files.
- **Organize** — reorder pages by drag and drop, remove pages, or insert blank pages.

All processing happens on request. Files are not stored beyond what's needed to complete the operation.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS v4 |
| Backend | Express, deployed as Vercel serverless functions |
| PDF processing | pdf-lib (server), pdfjs-dist (client-side page previews) |
| File storage | Vercel Blob |
| Monorepo tooling | npm workspaces, Turborepo |
| Testing | Vitest |
| Language | TypeScript throughout |

## Architecture

The frontend and backend are deployed as **two separate Vercel projects** from this one repository. This keeps the backend a genuine, independently deployable REST API rather than a set of Next.js API routes, and it's the reason a few things are structured the way they are.

The core constraint shaping the design: Vercel serverless functions cap request/response bodies at roughly 4.5MB, and the filesystem is stateless between invocations. This ruled out the naive approach of streaming a PDF's raw bytes through the Express function on every request. Instead:

```
Browser                          Express (serverless)           Vercel Blob
   |                                    |                            |
   | 1. POST /pdf/upload (multipart)    |                            |
   |----------------------------------->|                            |
   |                                    | 2. upload bytes            |
   |                                    |--------------------------->|
   |                                    | 3. public URL              |
   |                                    |<---------------------------|
   | 4. { url }                         |                            |
   |<-----------------------------------|                            |
   |                                    |                            |
   | 5. POST /pdf/merge { urls }        |                            |
   |----------------------------------->|                            |
   |                                    | 6. download input(s)       |
   |                                    |<---------------------------|
   |                                    | 7. transform with pdf-lib  |
   |                                    | 8. upload result           |
   |                                    |--------------------------->|
   |                                    | 9. result URL              |
   |                                    |<---------------------------|
   | 10. { url }                        |                            |
   |<-----------------------------------|                            |
```

The upload step keeps large file transfers out of the JSON request bodies that the merge/split/organize endpoints deal with — those only ever pass around small blob URLs and instructions. Page previews and drag-to-reorder in the "Organize" tool are rendered entirely client-side with `pdfjs-dist`, so browsing a file's pages costs no server round trip.

## Directory structure

```
pdf-toolkit/
├── apps/
│   ├── web/            # Next.js frontend — see apps/web/README.md
│   └── api/             # Express backend — see apps/api/README.md
├── packages/
│   ├── ui/               # Shared React component stubs (scaffolded, not yet used by web)
│   ├── shared-types/     # Reserved for types shared between web and api
│   ├── eslint-config/    # Shared ESLint configuration
│   └── typescript-config/# Shared tsconfig bases
├── turbo.json
├── package.json          # workspaces root
└── README.md
```

Each app is independently deployable and has its own README with setup details specific to it:

- [`apps/web/README.md`](./apps/web/README.md) — frontend setup, pages, environment variables
- [`apps/api/README.md`](./apps/api/README.md) — API reference, environment variables, deployment notes

## Getting started

Requires Node.js 18+ and npm.

```bash
git clone https://github.com/MuhammadTalha57/pdf-toolkit.git
cd pdf-toolkit
npm install
```

`npm install` at the root installs dependencies for every workspace (`apps/web`, `apps/api`, and `packages/*`) in one pass, via npm workspaces.

Each app needs its own environment variables before it will run — see the app-specific READMEs linked above. In short:
- `apps/web` needs `NEXT_PUBLIC_API_BASE_URL` pointing at the backend.
- `apps/api` needs `FRONTEND_URL` for CORS and `BLOB_READ_WRITE_TOKEN` for Vercel Blob access.

To run both apps in development at once from the root:

```bash
npm run dev
```

This runs Turborepo's `dev` task across all workspaces that define one. To run a single app, use Turborepo's filter flag, e.g. `npx turbo run dev --filter=web`, or `cd` into the app directory directly.

## Building and type-checking

```bash
npm run build         # turbo run build — builds every buildable workspace
npm run check-types    # turbo run check-types
npm run lint           # turbo run lint
```

## Deployment

Both apps are deployed to Vercel as separate projects from this repository:

- **web** — Root Directory set to `apps/web`, deployed with Vercel's standard Next.js framework preset.
- **api** — Root Directory set to `apps/api`, deployed as a serverless function via an explicit `vercel.json` (see [`apps/api/README.md`](./apps/api/README.md) for why this is explicit rather than framework-auto-detected).

Because they're separate projects with separate domains, the frontend calls the backend over CORS rather than same-origin requests.

## Known limitations

These are intentional scope decisions for a time-boxed portfolio project, not oversights:

- **No authentication or per-user history.** Every request is anonymous and stateless. `mongoose` is listed as a dependency in `apps/api` in anticipation of this, but no models or connection logic exist yet.
- **No page rotation.** The "Organize" tool supports reordering, deleting, and inserting blank pages, but not rotating a page — the backend service doesn't implement it yet.
- **4MB upload limit.** Set deliberately below Vercel's ~4.5MB serverless request body cap.
- **PDF-to-Word/OCR/password protection are out of scope.** These typically require native binaries (LibreOffice, Tesseract, qpdf) that don't run in a serverless environment.