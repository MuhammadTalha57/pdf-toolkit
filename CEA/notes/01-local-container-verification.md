# Phase 1 — Local container verification

**Goal:** prove the containerized three-tier stack works end-to-end before paying
for AWS resources.

**Artifacts verified:** `apps/api/Dockerfile`, `apps/web/Dockerfile`,
`docker-compose.yml`, `.dockerignore`.

## Stack

`docker compose` starts five containers:

| Service | Image | Purpose |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Local stand-in for RDS PostgreSQL |
| `minio` | `elestio/minio:latest` | Local stand-in for S3 |
| `minio-init` | `elestio/minio:latest` | Creates the `pdf-toolkit-files` bucket |
| `api` | built from `apps/api/Dockerfile` | Express API on 3000 (host 4000) |
| `web` | built from `apps/web/Dockerfile` | Next.js standalone on 3000 |

The web container proxies `/api/*` to `http://api:3000`; the browser only talks to
port 3000. The API uses PostgreSQL for metadata and MinIO/S3 for PDF bytes.

## Commands

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs api --tail 30
```

Open `http://localhost:3000`.

To reproduce from a completely clean database and bucket:

```bash
docker compose down -v
docker compose up -d
```

`down -v` deletes the `pgdata` and `miniodata` volumes. The API applies migration
`001_init` on start and `minio-init` recreates the bucket.

## Verification results

| Check | Result |
|---|---|
| `GET http://localhost:4000/health` | `200 {"status":"ok"}` |
| `GET http://localhost:3000/api/health` (through web rewrite) | `200 {"status":"ok"}` |
| Signup + auth cookie | 200, `Set-Cookie: pdf_token=…; HttpOnly; SameSite=Lax` |
| `GET /api/auth/me` with cookie | 200, returns user id/email |
| `GET /api/documents` without cookie | 401 |
| Upload two 4-page PDFs | two temporary document ids |
| Merge | 200, `pageCount: 8`, result id |
| Split into two 2-page parts | 200, two result ids |
| Organize (reorder + blank page) | 200, `pageCount: 3` |
| History | only `ready` results, newest first |
| Download result | 200, `%PDF-` magic, full byte count |
| Cross-user download | 404 |
| Cross-user merge with foreign id | 400 |
| Cross-user history | empty |
| S3 bucket after operations | only `users/<id>/results/*.pdf`; zero `tmp/` leftovers |
| Malformed document id | 404 (no Postgres UUID error) |
| API tests | 7 files, 18 tests passed |
| Web type-check / production build | passed |

## Issues hit and fixes

### 1. MinIO images were not pullable

- **Symptom:** `docker compose up` failed with
  `pull access denied for minio/mc, repository does not exist or may require 'docker login'`.
  `minio/minio` failed the same way; `quay.io/minio/*` returned `401 UNAUTHORIZED`.
- **Cause:** the official MinIO images were not reachable from this environment.
- **Fix:** use `elestio/minio:latest`, a community image that contains both
  `/usr/bin/minio` and `/usr/bin/mc`. The `minio-init` service retries
  `mc alias set` until the server is ready:

  ```yaml
  entrypoint: >
    /bin/sh -c "
    until mc alias set local http://minio:9000 minioadmin minioadmin; do sleep 1; done;
    mc mb --ignore-existing local/pdf-toolkit-files;
    exit 0;
    "
  ```

  This is a **local-development workaround only**. AWS uses a real S3 bucket
  created by Terraform; no MinIO is deployed to AWS.

### 2. Malformed document id produced a 500

- **Symptom:** `GET /api/documents/not-a-uuid/download` returned 500.
- **Cause:** the string reached PostgreSQL as a `uuid` parameter and raised
  `invalid input syntax for type uuid`.
- **Fix:** reject non-UUID ids before querying
  (`apps/api/src/services/document.service.ts`):

  ```ts
  const UUID_PATTERN =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  export async function getDocumentForUser(id: string, userId: string) {
      if (!UUID_PATTERN.test(id)) return null;
      // ...
  }
  ```

  Download now returns 404; operations return 400 (`Could not read the requested
  document`). Added `document.service.test.ts` to lock this behavior in.

### 3. Migration race with multiple API tasks

- **Symptom/risk:** with more than one ECS task starting at once, both could read
  `schema_migrations` as empty and both try to insert the same migration id,
  causing a duplicate-key failure and a restart loop.
- **Fix:** wrap the whole migration run in a PostgreSQL session-level advisory
  lock (`727274`), and release it in `finally`
  (`apps/api/src/db/migrate.ts`). Only one task migrates; the others wait, then
  see the migration is already applied.

### 4. `COOKIE_SECURE` would break auth over an HTTP ALB

- **Symptom/risk:** `NODE_ENV=production` makes `useSecureCookies()` default to
  `true`. A `Secure` cookie is never sent over plain HTTP, so login would appear
  to succeed and then every authenticated request would be 401.
- **Fix:** set `COOKIE_SECURE=false` explicitly in `docker-compose.yml` and in the
  ECS task definition (Terraform `var.cookie_secure`, default `false`). Set it to
  `true` only when the ALB has an ACM certificate and HTTPS.

### 5. `.dockerignore` did not exclude nested `.env` files

- **Symptom:** the web image build log said `Environments: .env`, meaning
  `apps/web/.env` had been copied into the build context.
- **Cause:** `.env` only matches the repository root; it does not match
  `apps/web/.env`.
- **Fix:** use `**/.env` and `**/.env.*` in `.dockerignore`. The Docker build args
  (`API_INTERNAL_URL`, `NEXT_PUBLIC_API_BASE_URL`) now supply the values
  deterministically.

### 6. Problem-statement path changed

- The PDF was moved into `CEA/`, so the smoke test initially tried to upload a
  missing root-level file. Use `CEA/CEA - Problem Statement.pdf`.

## Useful smoke commands

```bash
BASE=http://localhost:3000/api
COOKIE=/tmp/pdf-cookies.txt

curl -s -c "$COOKIE" -X POST "$BASE/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password123"}'

curl -s -b "$COOKIE" -F "file=@CEA/CEA - Problem Statement.pdf;type=application/pdf" \
  "$BASE/pdf/upload"
```

Take the returned `documentId`, upload a second file, then:

```bash
curl -s -b "$COOKIE" -X POST "$BASE/pdf/merge" \
  -H 'Content-Type: application/json' \
  -d '{"documentIds":["<id-1>","<id-2>"]}'

curl -s -b "$COOKIE" "$BASE/documents"
curl -s -b "$COOKIE" -o merged.pdf "$BASE/documents/<result-id>/download"
```

## Evidence

App screenshots are in `CEA/screenshots/local/` (landing, signup, logged-in
landing, history, merge/split/organize tools, merge success, login).

## Cleanup

```bash
docker compose down        # keep data
docker compose down -v     # delete data
```
