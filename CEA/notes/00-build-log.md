# Build Log — CEA Three-Tier Deployment

This is a chronological, replicable record of what was done, why, which problems
were hit, and how they were fixed. Commands are included so a reader can repro-
duce the steps.

---

## Phase 0 — Analysis and design (2026-11-09)

**What:** Read the CEA problem statement and audited the existing repository.

**Findings:**
- Existing app: Next.js frontend + Express API, deployed as two Vercel projects.
- Files stored in Vercel Blob; no database, no authentication, no CI/CD, no Docker.
- Vercel is a PaaS and cannot provide the VPC/subnets/NAT/ALB/Auto Scaling/RDS
  required by the assignment. The hosting model had to change, not just the DB.

**Decisions:**
- Cloud: AWS personal/free-tier account with credits.
- Compute: ECS Fargate (containers, managed, autoscaling).
- Database: RDS PostgreSQL in private subnets (managed, allowed engine).
- Files: S3 (required enhancement), **not** PostgreSQL binaries.
- Second enhancement: Terraform infrastructure as code.
- Auth: JWT in httpOnly cookie, per-user document history.
- App tier reachable only from web tier (web proxies `/api`).

**Why not store PDFs in Postgres:** binary blobs bloat the DB and backups, cannot
stream efficiently, and inflate RDS storage cost. S3 is purpose-built and is
itself one of the required enhancements.

**Artifacts:** design doc and implementation plan under `docs/superpowers/`.

---

## Phase 1 — Local containers and end-to-end verification (2026-11-09)

**What:** built both images, started PostgreSQL + MinIO + API + web with
`docker compose`, and exercised every API flow from a clean database.

**Result:** signup/login/me, upload, merge (8 pages), split (two 2-page parts),
organize (3 pages), per-user history, downloads, cross-user isolation, malformed
id handling, and S3 temp cleanup all verified. 18 API tests pass; web type-check
and build pass. Screenshots are in `CEA/screenshots/local/`.

**Key problems and fixes:**

- Official MinIO images were not pullable from this environment. Used
  `elestio/minio:latest` (contains both `minio` and `mc`) for local development
  only; AWS uses real S3.
- Malformed document ids reached PostgreSQL and caused 500s. Added a UUID guard
  in `document.service.ts`; downloads now return 404, operations 400.
- Multiple API tasks could race during migrations. Added a PostgreSQL advisory
  lock around the migration run.
- `COOKIE_SECURE` defaults to true in production; an HTTP ALB would drop the auth
  cookie. Compose and Terraform set it false explicitly, true only with TLS.
- `.dockerignore` did not exclude nested `.env` files; corrected to `**/.env`.

**Details:** `CEA/notes/01-local-container-verification.md`.

---

## Phase 2 — Terraform infrastructure (2026-11-09)

**What:** wrote the full Terraform stack under `infra/terraform/`: VPC with two
public/private app/private DB subnets, single NAT, four security groups, S3,
ECR, RDS PostgreSQL, SSM SecureString secrets, IAM roles, ALB, ECS Fargate with
Service Connect, autoscaling, CloudWatch logs and alarms, and a GitHub OIDC
deploy role.

**Result:** `terraform fmt`, `terraform init -backend=false`, and
`terraform validate` succeed (Terraform 1.17.0, AWS provider 5.100.0).

**Key problems and fixes:**

- Service Connect expects `port_name`, not `port`; corrected to match the
  container port-mapping name `api`.
- S3 lifecycle uses `days_after_initiation`, not `days_since_initiation`.
- Terraform was not on the current shell PATH after Winget; used the full binary
  path.

**Not applied yet:** no AWS credentials on this machine. The next phase is
`terraform apply`, the first ECR image push, and console screenshots.

**Details:** `CEA/notes/02-terraform-infrastructure.md`.

---

## Phase 3 — CI/CD with GitHub Actions and OIDC (2026-11-09)

**What:** added `.github/workflows/ci-cd.yml` with a test job (install,
type-check, API tests, build) and a main-only deploy job (OIDC role assumption,
ECR login, Buildx, push `latest` + commit SHA, force new ECS deployments, wait for
steady state).

**Result:** workflow written and reviewed; not executed yet because it requires
the applied stack and the `AWS_ROLE_ARN` repository variable.

**Key decisions:** CI does not register task definitions or use `iam:PassRole`;
Terraform owns the definitions, CI replaces the `latest` image and forces a new
deployment. Buildx setup was added so the GitHub Actions layer cache works.

**Details:** `CEA/notes/03-ci-cd.md`.

---

## Phase 4 — Report and runtime hardening (2026-11-09)

**What:** extracted the 4–6 page submission requirement from the problem
statement, condensed the technical report, and retained an extended report with
appendices. The condensed version was rendered as a six-page A4 document.

The API and web Dockerfiles were hardened to run as the unprivileged `node`
user, using `COPY --chown` and a writable Next.js cache directory. Both images
were rebuilt and the local smoke flow rechecked: authentication, upload,
merge, download, cross-user isolation, malformed UUID handling, and temporary
object cleanup all passed. Terraform formatting, initialization, and
validation remained successful.

The report now embeds a side-by-side local evidence image, and
`screenshots/CHECKLIST.md` tracks the remaining AWS console, registry, and
CI/CD evidence required after credentials and `terraform apply` are available.

---
