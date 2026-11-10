# API — application tier (`apps/api`)

Express 5 + TypeScript service that owns authentication, PDF processing and
document history. In AWS it runs as the `pdf-toolkit-prod-api` ECS service and
is reachable only from the web tier.

## How it works

- **Auth:** email + bcrypt password hash in PostgreSQL; a signed JWT (HS256) in
  an `httpOnly`, `SameSite=Lax` cookie.
- **Upload:** `POST /pdf/upload` validates the PDF, stores it in S3 under
  `tmp/<uuid>.pdf`, and records a `temp` document row (24 h TTL; an S3
  lifecycle rule deletes leftovers).
- **Operations:** merge / split / organize load the caller's own documents from
  S3, transform them with `pdf-lib`, store results under
  `users/<userId>/results/<uuid>.pdf` as `ready` rows, and delete the temp
  inputs.
- **Download:** streamed from S3 after an ownership check; the bucket is never
  public and no presigned URLs are issued.
- **Migrations:** SQL in `src/db/migrations` runs on start-up under a
  PostgreSQL advisory lock, so concurrent tasks don't race.
- **Hardening:** helmet, rate limiting (300 requests / 15 min per client),
  upload size cap, PDF MIME and parse checks, UUID validation, non-root
  container user.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | – | Liveness check (used by the container health check) |
| POST | `/auth/signup` | – | Create an account, set the session cookie |
| POST | `/auth/login` | – | Sign in |
| POST | `/auth/logout` | – | Clear the cookie |
| GET | `/auth/me` | ✓ | Current user |
| POST | `/pdf/upload` | ✓ | Multipart field `file`; returns `documentId`, `pageCount` |
| POST | `/pdf/merge` | ✓ | `{ "documentIds": [...] }` |
| POST | `/pdf/split` | ✓ | Split one document into page ranges |
| POST | `/pdf/organize` | ✓ | Reorder / drop pages / insert blanks |
| GET | `/documents` | ✓ | The caller's history |
| GET | `/documents/:id/download` | ✓ | Download one of the caller's results |

The browser calls these through the web tier as `/api/...`.

## Configuration

All settings are environment variables, validated at start-up
(`src/config/env.ts`). See [`.env.example`](.env.example).

| Variable | Required | In AWS comes from |
|---|---|---|
| `DATABASE_URL` | yes | SSM SecureString (`/pdf-toolkit-prod/database-url`) |
| `JWT_SECRET` | yes (≥ 16 chars) | SSM SecureString (`/pdf-toolkit-prod/jwt-secret`) |
| `S3_BUCKET` | yes | Terraform (task definition) |
| `AWS_REGION` | – | Terraform |
| `FRONTEND_ORIGIN` | – | Terraform (ALB URL) |
| `COOKIE_SECURE` | – | Terraform (`false`: HTTP demo ALB) |
| `MAX_UPLOAD_MB` | – | Terraform |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | local only | MinIO in Compose; unset in AWS (the task role is used) |

## Scripts

```bash
npm run dev --workspace api          # tsx watch on :4000 (reads apps/api/.env)
npm test --workspace api             # Vitest unit tests
npm run build --workspace api        # compile to dist/
npm run check-types --workspace api
```

## Container

`Dockerfile` (build from the repository root): a multi-stage `node:20-alpine`
build that installs only this workspace, compiles TypeScript, downloads the AWS
RDS CA bundle (used for `sslmode=verify-full`) and runs `node dist/server.js` as
the `node` user on port 3000.
