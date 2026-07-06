# PDF Toolkit — Frontend (`apps/web`)

The Next.js frontend for PDF Toolkit. Provides the landing page and three tool pages (merge, split, organize) that talk to the [Express API](../api/README.md) to process PDFs.

**Live:** https://pdf-toolkit-web-orcin.vercel.app/

## Tech stack

- **Next.js** (App Router) with TypeScript
- **Tailwind CSS v4** for styling, using CSS-based theme tokens rather than a JS config file
- **pdfjs-dist** for rendering page thumbnails and reading page counts entirely client-side, before anything is uploaded
- **lucide-react** for icons

## How the tools work

Each tool page follows the same general pattern:

1. The user drops or selects a PDF (`Dropzone`).
2. For Split and Organize, the file is read and its pages are rendered to thumbnails **client-side** using `pdfjs-dist` — no upload needed just to preview a file.
3. On submit, the file is uploaded to the backend (`POST /pdf/upload`), which stores it in Vercel Blob and returns a URL.
4. That URL (plus whatever operation-specific instructions — page ranges, page order) is sent to the relevant endpoint (`/pdf/merge`, `/pdf/split`, or `/pdf/organize`).
5. The backend returns a result URL (or URLs, for split), which the UI offers as a download.

Downloads are implemented by fetching the result and creating an object URL (see `lib/download.ts`), rather than a plain `<a href download>`, since the Blob URLs are cross-origin and browsers don't reliably force a save-as on cross-origin links.

### PDF.js worker

`pdfjs-dist` requires a worker script to parse and render PDFs off the main thread. This project serves that worker from `public/pdf.worker.min.mjs` rather than pointing at a CDN, so page rendering doesn't depend on a third-party host being available. The version of that file must match the installed `pdfjs-dist` version in `package.json` — if you bump the dependency, replace this file with the matching one from the new version's `node_modules/pdfjs-dist/build/`.

## Directory structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # fonts, Navbar/Footer, metadata
│   │   ├── page.tsx                # landing page
│   │   ├── globals.css             # design tokens (colors, fonts) and Tailwind import
│   │   └── (tools)/
│   │       ├── merge/page.tsx
│   │       ├── split/page.tsx
│   │       └── organize/page.tsx
│   ├── components/
│   │   ├── DropZone.tsx            # drag-and-drop / click-to-browse file input
│   │   ├── PageThumbnail.tsx       # renders a single page preview
│   │   ├── ToolCard.tsx            # landing page tool grid card
│   │   ├── Spinner.tsx
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       └── Footer.tsx
│   └── lib/
│       ├── api.ts                  # typed client for every backend endpoint
│       ├── pdfClient.ts            # client-side PDF loading and thumbnail rendering
│       ├── ranges.ts               # parses "1-3, 7" style input into page ranges
│       └── download.ts             # forces a real download of a cross-origin file
├── public/
│   └── pdf.worker.min.mjs          # self-hosted pdf.js worker (see above)
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Design system

The visual identity is a "paper and ink" theme, defined as CSS custom properties in `globals.css` and wired into Tailwind's `@theme` block:

- **Colors** — a warm paper background, navy ink for text, indigo for primary actions, amber for highlights.
- **Fonts** — Instrument Serif for display headings, Manrope for body text, IBM Plex Mono for file names and small labels.
- **Signature detail** — a small folded-corner motif (`.paper-corner` class) applied to cards and page thumbnails throughout, echoing a physical sheet of paper.

## Environment variables

Create `apps/web/.env.local` (not committed):

```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-project.vercel.app
```

This must point at the deployed (or locally running) `apps/api` backend. It's a `NEXT_PUBLIC_` variable because the browser calls the API directly — it's not read on the server side.

When deploying to Vercel, set this same variable in the project's Environment Variables settings, since `.env.local` is not deployed.

## Local development

From this directory:

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

Or from the repository root, using Turborepo's filter flag:

```bash
npx turbo run dev --filter=web
```

## Deployment

Deployed to Vercel as its own project, separate from the API:

- **Root Directory:** `apps/web`
- **Framework Preset:** Next.js (auto-detected)
- **Environment Variables:** `NEXT_PUBLIC_API_BASE_URL` set to the deployed API's URL

No custom `vercel.json` is needed for this app — Next.js is deployed with Vercel's standard framework support.