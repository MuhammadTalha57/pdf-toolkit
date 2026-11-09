# CEA — Cloud-Native Three-Tier Deployment

Course: **Cloud Computing (SE-490) — Complex Engineering Activity**

This folder contains everything required by the CEA problem statement
(`CEA - Problem Statement.pdf`).

## Status

| Area | Status |
|---|---|
| Application code (auth, history, S3) | Complete; 18 API tests pass |
| Local three-tier stack (Docker Compose) | Complete; end-to-end verified |
| Terraform infrastructure | Complete; `fmt`/`init`/`validate` pass |
| Technical report (4–6 pages) | Drafted; 6 pages in an A4 render |
| GitHub Actions CI/CD | Written; not run yet |
| AWS deployment + console screenshots | **Pending AWS credentials/apply** |

## Index

| Item | Location |
|---|---|
| Problem statement | `CEA - Problem Statement.pdf` |
| Build log / step-by-step history | `notes/00-build-log.md` |
| Phase 1 — local containers + verification | `notes/01-local-container-verification.md` |
| Phase 2 — Terraform infrastructure | `notes/02-terraform-infrastructure.md` |
| Phase 3 — CI/CD + OIDC | `notes/03-ci-cd.md` |
| Architecture diagram (SVG / PNG) | `architecture/architecture.svg`, `architecture/architecture.png` |
| Architecture explanation + Mermaid | `architecture/architecture.md` |
| Technical report — 4–6 page submission (convert to LaTeX later) | `report/technical-report.md` |
| Extended report (long-form detail + appendices) | `report/technical-report-full.md` |
| Cost estimate + optimizations | `report/cost-estimate.md` |
| Screenshot checklist | `screenshots/CHECKLIST.md` |
| Local application screenshots | `screenshots/local/` |
| Source: Dockerfiles | `apps/web/Dockerfile`, `apps/api/Dockerfile`, `docker-compose.yml` |
| Source: CI/CD | `.github/workflows/ci-cd.yml` |
| Source: Infrastructure as Code | `infra/terraform/` |
| Design document | `docs/superpowers/specs/2026-11-09-pdf-toolkit-cloud-deployment-design.md` |
| Implementation plan | `docs/superpowers/plans/2026-11-09-pdf-toolkit-cloud-deployment.md` |

## What the project is

A PDF toolkit (merge, split, organize) deployed as a three-tier application on
AWS:

- **Web tier:** Next.js standalone container (ECS Fargate, private app subnet)
- **Application tier:** Express API container (ECS Fargate, private app subnet,
  reachable only from the web tier through ECS Service Connect)
- **Database tier:** Amazon RDS for PostgreSQL 16 (private DB subnet)
- **Object storage:** Amazon S3 (temporary uploads + generated results)
- **Load balancing:** Internet-facing Application Load Balancer
- **Scaling:** ECS Service Auto Scaling (CPU and ALB request count)
- **CI/CD:** GitHub Actions (OIDC) → ECR → ECS
- **IaC:** Terraform

## How to replicate (high level)

1. Set up an AWS account/credentials and install Node 20+, Docker, Terraform, and
   the AWS CLI.
2. Copy `infra/terraform/terraform.tfvars.example` to `terraform.tfvars` and review
   the region, sizes, and `cookie_secure`.
3. `terraform init && terraform apply`.
4. Build and push the first `api` and `web` images to the two ECR repositories
   (ECS cannot become healthy before images exist). Commands are in
   `infra/terraform/README.md`.
5. Add the `github_deploy_role_arn` output as the GitHub repository variable
   `AWS_ROLE_ARN`.
6. Push to `main`; GitHub Actions tests, builds, pushes, and deploys.
7. Open the ALB DNS name and run the manual flow: signup → upload → merge/split/
   organize → history → download → cross-user isolation.
8. Capture screenshots from `screenshots/CHECKLIST.md`.
9. `terraform destroy` when finished.

Detailed, phase-by-phase steps with every command, problem, and fix are in
`notes/00-build-log.md` and the numbered phase notes.

## Implementation deviations from the approved design

The design was a living document; the implementation made four deliberate
changes and the report states them honestly:

1. **SSM Parameter Store SecureString instead of Secrets Manager** for
   `DATABASE_URL` and `JWT_SECRET` (standard parameters are free).
2. **Streamed downloads instead of presigned S3 URLs** (keeps the ownership check
   on every request and avoids S3 CORS/endpoint differences; works with both
   MinIO locally and AWS S3).
3. **CI forces a new ECS deployment of the `latest` image** instead of registering
   a new task definition (Terraform owns task definitions; CI does not need
   `iam:PassRole`). Commit SHA tags are still pushed for traceability.
4. **HTTP ALB by default with optional ACM HTTPS** (a domain/certificate is not
   assumed). `COOKIE_SECURE` is false by default and must be true with HTTPS.
