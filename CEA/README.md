# CEA — Cloud-Native Three-Tier Deployment

Cloud Computing (SE-490) · Complex Engineering Activity.
The brief is in [`CEA - Problem Statement.pdf`](CEA%20-%20Problem%20Statement.pdf).

## Deliverables

| # | Deliverable | Location |
|---|---|---|
| 1 | Architecture diagram (draw.io, AWS icons) | [`architecture/architecture.drawio`](architecture/architecture.drawio) → exported `architecture.png` / `.svg` |
| 2 | Deployment evidence (screenshots) | [`screenshots/aws/`](screenshots/aws) (AWS, CI/CD, live app); local run in `screenshots/local/` |
| 3 | Source files | Dockerfiles: [`apps/web/Dockerfile`](../apps/web/Dockerfile), [`apps/api/Dockerfile`](../apps/api/Dockerfile) · [`docker-compose.yml`](../docker-compose.yml) · pipeline: [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) · IaC: [`infra/terraform/`](../infra/terraform) · repo: https://github.com/MuhammadTalha57/pdf-toolkit |
| 4 | Technical report (title + 5 pages, incl. NFR section) | LaTeX source [`report/latex/main.tex`](report/latex/main.tex) |
| – | Cost estimate + optimisations | [`report/cost-estimate.md`](report/cost-estimate.md) |
| – | **Ready-to-submit folder** | [`submission/`](submission) (add `report.pdf` to `submission/04-report/`) |
| – | How to reproduce | [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) |

## Requirement checklist

| # | Requirement | Implementation |
|---|---|---|
| 1 | Network layer | VPC `10.0.0.0/16`; 2 public + 2 private subnets in 2 AZs; IGW; NAT gateway; public/private route tables; S3 gateway endpoint |
| 2 | Web tier | Next.js container on ECS Fargate behind the ALB |
| 3 | Application tier | Express container on ECS Fargate, private, reachable only from the web tier (Service Connect + security group) |
| 4 | Database tier | Amazon RDS PostgreSQL 16, private, only the API security group may connect |
| 5 | Container registry | Amazon ECR (`pdf-toolkit-prod-web`, `pdf-toolkit-prod-api`) |
| 6 | CI/CD | GitHub Actions: test → build → push to ECR → ECS rolling deploy (OIDC, no stored keys) |
| 7 | Load balancing and scaling | Application Load Balancer + target group; ECS Service Auto Scaling, 1–2 tasks per service on CPU |
| 8 | Security | Per-tier security groups, public/private segmentation, least-privilege IAM, SSM SecureString secrets, OIDC for CI |
| 9 | Enhancements | S3 object storage · Terraform IaC · CloudWatch logging · cost estimate |
| 10 | NFR justification | Report section 6 |
