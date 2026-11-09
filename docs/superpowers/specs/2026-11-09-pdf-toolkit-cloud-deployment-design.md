# PDF Toolkit — Cloud-Native Three-Tier Deployment (CEA) — Design

**Date:** 2026-11-09
**Status:** Approved
**Course:** Cloud Computing (SE-490) — Complex Engineering Activity
**Repo:** `github.com/MuhammadTalha57/pdf-toolkit`

## Intent

Turn the existing Vercel-hosted PDF Toolkit into a genuinely cloud-native,
three-tier application that satisfies the CEA problem statement: a VPC network,
containerized web and application tiers, a managed private PostgreSQL database,
a container registry, a CI/CD pipeline, a load balancer with autoscaling,
tiered security, at least one additional cloud-native enhancement, and an NFR
justification — deployed on AWS and evidenced with screenshots and a report.

The application work is kept lean: authentication, per-user document history,
and object storage. The bulk of the effort is infrastructure and deployment
automation, which the assignment requires.

## Goals

- Pass every numbered requirement (1–10) in the CEA problem statement.
- Deploy web + app tiers as Docker images on ECS Fargate behind an Internet-facing
  ALB; both tiers in private subnets.
- Managed PostgreSQL (RDS) reachable only from the application tier.
- S3 object storage for uploaded/processed PDFs (the required enhancement),
  plus Terraform IaC (a second enhancement).
- GitHub Actions CI/CD that builds, tests, pushes to ECR, and deploys to ECS.
- Authentication with per-user document history, so the database tier has a real
  purpose.
- Produce replicable step-by-step notes, screenshots checklist, architecture
  diagram, cost estimate, and a technical report.

## Non-goals / anti-goals

- No Kubernetes (explicitly optional in the brief; excessive for this scope).
- No page rotation, OCR, PDF-to-Word, or native-binary tooling.
- No storing PDF binaries in PostgreSQL (anti-goal: it bloats the DB/backups and
  cannot stream efficiently).
- No multi-region or active-active setup (out of scope; noted as a limitation).
- No custom domain/TLS certificate requirement (HTTP ALB acceptable for grading;
  HTTPS documented as an improvement).

## Constraints

- Cloud: AWS personal account with credits. Region is a Terraform variable
  (default `us-east-1`).
- Existing stack: npm workspaces + Turborepo, Next.js 16 (App Router), Express 5,
  TypeScript, pdf-lib, Vitest.
- Vercel serverless constraints no longer apply after containerization, but the
  4 MB cap is kept near current values to bound Fargate memory use.
- Terraform is not installed on the developer machine; apply steps are documented
  and executed after installation.
- Cost: NAT Gateway + ALB are ~$45–55/month combined; credits cover the grading
  window. Cost optimizations documented for the report.

## Approaches considered

| Decision | Options | Chosen | Why |
|---|---|---|---|
| Hosting | Stay on Vercel; single VM; ECS Fargate | **ECS Fargate** | Vercel cannot provide VPC/subnets/NAT/ALB/ASG/RDS. ECS is the cleanest map to every requirement with minimal server ops. |
| Web↔API boundary | ALB path-routes to both; web proxies `/api`; expose API directly | **Web proxies `/api` to API over Service Connect** | Makes the app tier reachable *only* from the web tier (SG-enforced), satisfies least privilege, keeps same-origin cookies/CORS. |
| File storage | PostgreSQL bytea; S3; Vercel Blob | **S3** | Required enhancement; scalable, cheap, lifecycle rules; DB stays small. |
| Compute provisioning | AWS console; Terraform | **Terraform** | Reproducible, doubles as a second enhancement; console screenshots captured after apply. |
| Auth | Sessions table; JWT in localStorage; JWT httpOnly cookie | **JWT httpOnly cookie** | Stateless across Fargate tasks, safe against XSS token theft, same-origin via proxy. |
| DB access | Prisma; Drizzle; raw `pg` + SQL migrations | **`pg` + SQL migrations** | No native engine/binary packaging issues in Alpine images; simple, transparent, easy to replicate. |
| Downloads | Public S3; presigned GET; API stream proxy | **Presigned GET** | Keeps the bucket private; short-lived URLs; S3 CORS allows the app origin. |

## Target architecture

```
Internet
   │
   ▼
[ALB]  public subnets ×2 AZs · SG: 80/443 from 0.0.0.0/0
   │ default → web target group :3000
   ▼
[ECS: web – Next.js]  private subnets ×2 · SG: 3000 only from ALB
   │  /api/* proxied internally (ECS Service Connect: api:3000)
   ▼
[ECS: api – Express]  private subnets · SG: 3000 only from web
   ├──► [RDS PostgreSQL]  private subnets · SG: 5432 only from api
   ├──► [S3 bucket]  private · tmp/ (24h lifecycle) + users/<id>/
   └──► [Secrets Manager]  DB creds (RDS-managed) + JWT secret
[ECR] ◄── GitHub Actions (OIDC, no static keys) ──► ECS deploy
CloudWatch Logs · NAT Gateway for ECS outbound · ECS Service Auto Scaling
```

## Requirement → design mapping

| # | Requirement | Design |
|---|---|---|
| 1 | Network layer | VPC `10.0.0.0/16`, 2 public + 2 private subnets across 2 AZs, IGW, one NAT + EIP, public/private route tables |
| 2 | Web tier | Next.js standalone container on ECS Fargate in private subnets; only ALB is public |
| 3 | App tier | Express container on ECS Fargate in private subnets; SG allows only web SG; web proxies `/api` |
| 4 | DB tier | RDS PostgreSQL, private subnet group, SG allows only api SG, RDS-managed master password in Secrets Manager |
| 5 | Registry | ECR repositories `pdf-toolkit/web`, `pdf-toolkit/api` |
| 6 | CI/CD | GitHub Actions: lint/typecheck/vitest → OIDC → build/push (SHA tag) → register task defs → update ECS → wait stable → `/health` smoke |
| 7 | LB + scaling | Internet-facing ALB across 2 AZs, target group + health checks; ECS Service Auto Scaling (CPU 60%, min 2 / max 4) |
| 8 | Security | Least-privilege SGs, private subnets, Secrets Manager, OIDC, S3 block-public + presigned, helmet, httpOnly cookies, ownership checks, no arbitrary-URL fetch (SSRF removed) |
| 9 | Enhancement | S3 object storage **and** Terraform IaC |
| 10 | NFRs | Report maps decisions to scalability, availability, elasticity, security, maintainability, performance, cost, portability with honest gaps |

## Application design

### Data model (PostgreSQL)

```sql
users (
  id            uuid primary key,
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
)

documents (
  id           uuid primary key,
  user_id      uuid not null references users(id) on delete cascade,
  kind         text not null,          -- upload | merge | split | organize
  original_name text not null,
  s3_key       text not null,
  size_bytes   bigint not null,
  page_count   integer,
  status       text not null,          -- temp | ready
  operation    jsonb,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz
)
-- indexes: documents(user_id, created_at desc), documents(status)
```

Uploads are stored as `temp` and deleted after successful processing (S3 `tmp/`
prefix also has a 24-hour lifecycle backstop). Generated outputs are `ready` and
stored under `users/<userId>/results/`. History lists `ready` documents.

### Storage layout

```
s3://<bucket>/tmp/<uuid>.pdf                        # transient uploads
s3://<bucket>/users/<userId>/results/<uuid>.pdf     # generated outputs (retained)
```

### API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | no | ALB health check |
| POST | `/auth/signup` | no | Create user, set JWT cookie |
| POST | `/auth/login` | no | Authenticate, set JWT cookie |
| POST | `/auth/logout` | no | Clear cookie |
| GET | `/auth/me` | yes | Current user |
| POST | `/pdf/upload` | yes | Multipart upload → temp document id |
| POST | `/pdf/merge` | yes | `{ documentIds[] }` → result document id |
| POST | `/pdf/split` | yes | `{ documentId, splits }` → result ids |
| POST | `/pdf/organize` | yes | `{ documentId, operations }` → result id |
| GET | `/documents` | yes | History of ready documents |
| GET | `/documents/:id/download` | yes | Ownership check → presigned URL |

### Auth

- Passwords hashed with `bcryptjs`.
- JWT signed/verified with `jose` (HS256, `JWT_SECRET`).
- Cookie: `httpOnly`, `SameSite=Lax`, `Secure` in production, path `/`, 7-day expiry.
- `requireAuth` reads the cookie, verifies, attaches `req.userId`.

### Frontend

- `AuthProvider` calls `GET /auth/me` on load; exposes user + login/signup/logout.
- New `/login`, `/signup`, `/history` pages.
- Tool pages upload first, then send document IDs to operations, then download the
  returned document.
- API base URL becomes relative `/api`; Next rewrites `/api/:path*` to the internal
  API service (`API_INTERNAL_URL`, default `http://localhost:4000` locally).
- Navbar shows auth state and a History link.

## Infrastructure (Terraform)

Flat module under `infra/terraform/` with local state (gitignored). Resources:
VPC/subnets/IGW/NAT/routes, four security groups, RDS + subnet group + managed
master password, Secrets Manager (JWT secret), ECR, S3 (+ block public + lifecycle
+ CORS), IAM task roles + GitHub OIDC role, ECS cluster/task definitions/services
+ Service Connect, ALB + target group + listeners, CloudWatch log groups, ECS
service autoscaling.

**Remote state** is documented as an improvement (S3 + DynamoDB lock) but not
implemented, to keep bootstrap simple.

## CI/CD

`.github/workflows/ci-cd.yml`:
1. `npm ci`
2. `npm run lint`, `npm run check-types`, `npm test`
3. `aws-actions/configure-aws-credentials` via GitHub OIDC
4. ECR login, build + push both images tagged with the git SHA
5. Render task definitions with new image tags, update ECS services
6. Wait for services to stabilize
7. Smoke test `GET /health`

## Security

- No public compute: only the ALB is Internet-facing.
- Four least-privilege security groups (ALB → web → api → RDS).
- S3 bucket private; downloads via short-lived presigned URLs; CORS limited.
- Credentials in Secrets Manager; ECS injects them as environment secrets.
- GitHub Actions uses OIDC, never long-lived AWS keys.
- Application: `helmet`, rate limiting, input validation, ownership checks on
  every document operation, no arbitrary-URL fetching.
- HTTPS/TLS with ACM is documented as an improvement (needs a domain).

## NFR mapping (summary for the report)

- **Scalability:** stateless containers, ALB distribution, ECS tasks across 2 AZs.
- **Availability:** multi-AZ ALB and tasks, RDS automated backups (Multi-AZ noted
  as an optional upgrade), health checks and rolling deployments.
- **Elasticity:** ECS Service Auto Scaling on CPU/requests.
- **Security:** private subnets, SG segmentation, Secrets Manager, OIDC, presigned
  URLs, defense in depth.
- **Maintainability:** container images, Terraform, one-command CI/CD.
- **Performance:** two AZs, CDN-less static Next assets served by the web tier,
  right-sized Fargate tasks; PDF processing is CPU-bound and bounded by upload size.
- **Cost:** single NAT, Fargate sizing, RDS Single-AZ gp3, S3 lifecycle, scale-to-zero
  outside grading.
- **Portability:** Docker images run on any container platform; Terraform isolates
  AWS specifics.

## Known limitations (to state honestly)

- Single NAT Gateway (outbound single point of failure) for cost.
- RDS Single-AZ by default (enable Multi-AZ for production-grade availability).
- No custom domain/TLS termination by default.
- In-memory rate limiting is per task, not global.
- Fargate task sizing limits very large PDFs.
- Local Terraform state contains sensitive values.

## Deliverables

Under `CEA/`: index, step-by-step build notes (per phase, with problems/fixes),
architecture diagram, technical report (Markdown, 4–6 pages), cost estimate,
screenshots checklist and images. Code deliverables: Dockerfiles, compose,
Terraform, CI/CD workflow, updated app code and READMEs.

## Open items

- Confirm GitHub repo path for OIDC trust (default assumed:
  `MuhammadTalha57/pdf-toolkit`).
- Confirm AWS region (default `us-east-1`).
