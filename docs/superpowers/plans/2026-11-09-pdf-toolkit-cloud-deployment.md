# PDF Toolkit Cloud-Native Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Vercel-hosted PDF Toolkit into a three-tier AWS deployment (ECS Fargate + ALB + RDS + S3) with auth, per-user history, Terraform infra, and GitHub Actions CI/CD, plus CEA evidence documents.

**Architecture:** Next.js (web) and Express (api) run as separate Fargate services in private subnets. An Internet-facing ALB reaches only the web tier; the web tier proxies `/api` to the api tier over ECS Service Connect. PostgreSQL lives in RDS, files in private S3.

**Tech Stack:** TypeScript, Express 5, Next.js 16, pdf-lib, `pg`, `jose`, `bcryptjs`, `@aws-sdk/client-s3`, Docker, Terraform, GitHub Actions, ECR, ECS Fargate, ALB, RDS PostgreSQL, S3, Secrets Manager, CloudWatch.

**Spec:** `docs/superpowers/specs/2026-11-09-pdf-toolkit-cloud-deployment-design.md`

## Global Constraints

- AWS region is a Terraform variable, default `us-east-1`.
- GitHub repo assumed: `MuhammadTalha57/pdf-toolkit` (Terraform variable).
- PDF binaries never stored in PostgreSQL.
- Max upload 10 MB (multer limit), PDF MIME only.
- All document operations require authentication and ownership checks.
- No arbitrary URL fetching (removes SSRF).
- Node 20+ in containers; `node:20-alpine`.
- Secrets never committed; use Secrets Manager / env vars.
- Terraform state and `.tfvars` gitignored.

## Review Focus

- Uploading a file, then merging/splitting with another user's document id must fail with 403/404.
- A download request for a document not owned by the caller must not return a presigned URL.
- `GET /api/*` must be reachable only through the web tier, never directly.
- Missing/expired JWT (or cookie) must return 401, and the frontend must redirect to login.
- Oversized/non-PDF uploads must be rejected before reaching S3.

---

### Task 1: Backend dependencies, env config, database layer

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/db/pool.ts`
- Create: `apps/api/src/db/migrate.ts`
- Create: `apps/api/src/db/migrations/001_init.sql`
- Modify: `apps/api/tsconfig.json` (add `rootDir`/`outDir` via build config)
- Create: `apps/api/tsconfig.build.json`
- Modify: `.gitignore` (un-ignore `apps/api/src/server.ts`)
- Create: `apps/api/.env.example`

**Interfaces:**
- Produces: `env` object (`DATABASE_URL`, `JWT_SECRET`, `S3_BUCKET`, `AWS_REGION`, `S3_ENDPOINT?`, `FRONTEND_ORIGIN`, `NODE_ENV`, `PORT`, `COOKIE_SECURE`), `pool` (`pg.Pool`), `query<T>(text, params)`, `runMigrations(): Promise<void>`.

- [ ] Add deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `pg`, `jose`, `bcryptjs`, `cookie-parser`, `helmet`; dev `@types/pg`, `@types/cookie-parser`. Remove `mongoose`.
- [ ] Add `build` (`tsc -p tsconfig.build.json`), `start` (`node dist/server.js`), `db:migrate` scripts.
- [ ] Write `env.ts`, `pool.ts`, migration runner, and `001_init.sql` (tables + indexes from spec).
- [ ] Verify: `npm run build --workspace api`.

### Task 2: S3 storage service

**Files:**
- Create: `apps/api/src/services/storage.service.ts`
- Delete: `apps/api/src/utils/blobUtils.ts`

**Interfaces:**
- Produces: `putObject(key, body, contentType)`, `getObjectBuffer(key)`, `deleteObject(key)`, `presignedGetUrl(key, expiresIn?)`, `tempKey()`, `resultKey(userId)`.

- [ ] Implement S3 client (supports MinIO via `S3_ENDPOINT` + `forcePathStyle`).
- [ ] Unit test key helpers; verify `npm test --workspace api`.

### Task 3: Authentication

**Files:**
- Create: `apps/api/src/services/auth.service.ts`
- Create: `apps/api/src/middlewares/auth.middleware.ts`
- Create: `apps/api/src/controllers/auth.controller.ts`
- Create: `apps/api/src/routes/auth.routes.ts`
- Create: `apps/api/src/types/express.d.ts`
- Create tests: `apps/api/src/services/auth.service.test.ts`

**Interfaces:**
- Produces: `hashPassword`, `verifyPassword`, `signToken(userId)`, `verifyToken(token)`, `requireAuth` middleware (sets `req.userId`), routes `/auth/signup|login|logout|me`.

- [ ] Implement with `bcryptjs` + `jose`; cookie `httpOnly`, `SameSite=Lax`, `Secure` when `COOKIE_SECURE`.
- [ ] Validate email/password with zod.
- [ ] Verify tests.

### Task 4: Documents history + download

**Files:**
- Create: `apps/api/src/controllers/document.controller.ts`
- Create: `apps/api/src/routes/document.routes.ts`
- Create: `apps/api/src/services/document.service.ts`

**Interfaces:**
- Produces: `listDocuments(userId)`, `getDocumentForUser(id, userId)`, `createDocument(...)`, `deleteDocumentRow(id)`; routes `GET /documents`, `GET /documents/:id/download`.

- [ ] Return 404 when not owned; presigned URL only for `ready` docs.
- [ ] Verify ownership tests.

### Task 5: Rewrite PDF controllers to document IDs + S3

**Files:**
- Modify: `apps/api/src/controllers/pdf.controller.ts`
- Modify: `apps/api/src/routes/pdf.routes.ts`
- Modify: `apps/api/src/services/read.service.ts` (accept Buffer)
- Modify: `apps/api/src/services/read.service.test.ts`
- Modify: `apps/api/src/middlewares/upload.middleware.ts` (10 MB)

**Interfaces:**
- Upload → `{ documentId }` (temp). Merge `{ documentIds }`, split `{ documentId, splits }`, organize `{ documentId, operations }` → `{ documentId | documentIds }`.
- `readPDFFromBuffer(buffer)` replaces URL fetching.

- [ ] Enforce auth + ownership; store outputs under `users/<id>/results/`; delete temp inputs after success.
- [ ] Verify: unit tests + manual curl later.

### Task 6: App wiring and server entry

**Files:**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/middlewares/error.middleware.ts`

- [ ] Add `helmet`, `cookie-parser`, cookie-aware CORS, mount auth/document routes.
- [ ] `server.ts`: `PORT` from env, `runMigrations()` before listen, graceful shutdown.
- [ ] Verify: `npm run build --workspace api`, `npm test`.

### Task 7: Frontend API client, auth, history

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/auth.ts` (client helpers)
- Create: `apps/web/src/components/auth/AuthProvider.tsx`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(auth)/signup/page.tsx`
- Create: `apps/web/src/app/history/page.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/layout/Navbar.tsx`
- Modify: `apps/web/src/app/page.tsx` (copy)

- [ ] Relative `/api`, `credentials: "include"`; auth + document endpoints.
- [ ] AuthProvider context; login/signup forms; history table with download.
- [ ] Verify: `npm run build --workspace web`.

### Task 8: Tool pages use document IDs

**Files:**
- Modify: `apps/web/src/app/(tools)/merge/page.tsx`
- Modify: `apps/web/src/app/(tools)/split/page.tsx`
- Modify: `apps/web/src/app/(tools)/organize/page.tsx`
- Modify: `apps/web/src/lib/download.ts` (accept presigned flow)

- [ ] Upload returns id; operations send ids; download via `/documents/:id/download` presigned URL.
- [ ] Verify: typecheck/build.

### Task 9: Next config + Docker + compose

**Files:**
- Modify: `apps/web/next.config.ts` (`output: "standalone"`, rewrites)
- Create: `apps/web/Dockerfile`, `apps/web/.dockerignore`
- Create: `apps/api/Dockerfile`, `apps/api/.dockerignore`
- Create: `docker-compose.yml`
- Create: `apps/web/.env.example`, update `apps/api/.env.example`

- [ ] Multi-stage images from repo root context.
- [ ] Compose services: `postgres`, `minio`, `minio-init`, `api`, `web`.
- [ ] Verify: `docker compose up --build`, browser flow (signup → upload → merge → history → download).

### Task 10: Terraform — network and security

**Files:** `infra/terraform/{providers,variables,network,security}.tf`, `terraform.tfvars.example`

- [ ] VPC, 2 public + 2 private subnets, IGW, NAT + EIP, route tables, 4 SGs.
- [ ] `terraform fmt`/`validate` (after installing Terraform).

### Task 11: Terraform — data, storage, registry

**Files:** `infra/terraform/{rds,s3,ecr,secrets}.tf`

- [ ] RDS PostgreSQL + subnet group + `manage_master_user_password`; S3 bucket + block public + CORS + lifecycle; ECR repos; JWT secret.

### Task 12: Terraform — IAM, ECS, ALB, autoscaling, logs

**Files:** `infra/terraform/{iam,alb,ecs,cloudwatch,outputs}.tf`

- [ ] Task roles, execution role, GitHub OIDC role; ECS cluster/task defs/services + Service Connect; ALB + target group + listener; autoscaling; log groups.

### Task 13: CI/CD workflow

**Files:** `.github/workflows/ci-cd.yml`

- [ ] Test job → OIDC → ECR push → task def render/update → wait stable → smoke.

### Task 14: CEA deliverables + notes

**Files:** `CEA/README.md`, `CEA/notes/*.md`, `CEA/architecture/architecture.md`, `CEA/report/technical-report.md`, `CEA/report/cost-estimate.md`, `CEA/screenshots/CHECKLIST.md`

- [ ] Step notes per phase (what/why/problems/fixes/commands).
- [ ] Architecture diagram (Mermaid + ASCII).
- [ ] 4–6 page report with NFR section.
- [ ] Screenshots checklist.

### Task 15: Final verification

- [ ] `npm install`, `npm run lint`, `npm run check-types`, `npm test`, `npm run build`.
- [ ] `docker compose config`; `terraform fmt -check`/`validate` if installed.
- [ ] Update READMEs.
