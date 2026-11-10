# Web — web tier (`apps/web`)

Next.js 16 (App Router) frontend. In AWS it runs as the `pdf-toolkit-prod-web`
ECS service behind the Application Load Balancer.

## How it works

- Pages: landing, `/login`, `/signup`, `/merge`, `/split`, `/organize`,
  `/history`. Tool pages require a signed-in user (`AuthGate`).
- PDF thumbnails and page counts are rendered **in the browser** with
  `pdfjs-dist` (worker in `public/pdf.worker.min.mjs`), so previewing needs no
  upload.
- The browser calls the API at the same origin under `/api/*`
  (`NEXT_PUBLIC_API_BASE_URL`). The Next.js server rewrites those requests to
  `API_INTERNAL_URL` (`next.config.ts`). In AWS that is `http://api:3000`,
  resolved by ECS Service Connect; in Compose it is the `api` service. The API
  is therefore never exposed publicly, and cookies stay first-party.

## Build-time settings

Rewrites are compiled into the standalone build, so these are Docker **build
arguments**:

| Arg | Default | Meaning |
|---|---|---|
| `API_INTERNAL_URL` | `http://api:3000` | Where the server proxies `/api/*` |
| `NEXT_PUBLIC_API_BASE_URL` | `/api` | Base path the browser uses |

For `npm run dev` the proxy target defaults to `http://localhost:4000`.

## Scripts

```bash
npm run dev --workspace web      # http://localhost:3000
npm run build --workspace web
npm run check-types --workspace web
npm run lint --workspace web
```

## Container

`Dockerfile` (build from the repository root): a multi-stage `node:20-alpine`
build using Next.js `output: "standalone"`; the runtime image holds only the
standalone server, static assets and `public/`, and runs as the `node` user on
port 3000.
