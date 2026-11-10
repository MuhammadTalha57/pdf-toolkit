# CEA Submission — PDF Toolkit on AWS

Cloud Computing (SE-490) · Complex Engineering Activity · Fall 2026
NED University of Engineering and Technology, Department of Software Engineering

**Group:** Muhammad Talha (SE-23057), Shah Iman Ali (SE-23096)
**Submitted to:** Miss Aminah
**Repository:** https://github.com/MuhammadTalha57/pdf-toolkit
**Live application:** http://pdf-toolkit-prod-alb-2038954540.us-east-1.elb.amazonaws.com

## Contents

| # | Required deliverable | Location |
|---|---|---|
| 1 | Architecture diagram | `01-architecture-diagram/architecture.png` (vector: `architecture.svg`; editable draw.io source: `architecture.drawio`) |
| 2 | Deployment evidence (screenshots) | `02-screenshots/aws/` (AWS + CI/CD + live app), `02-screenshots/local/` (Docker Compose run) |
| 3 | Source files | `03-source-files/` (see below) and the repository link above |
| 4 | Technical report (title page + 5 pages, max 6) | `04-report/report.pdf` · LaTeX source: `04-report/report-overleaf.zip` · cost detail: `04-report/cost-estimate.md` |

## 2. Screenshots → problem-statement checklist

| Required evidence | File(s) in `02-screenshots/aws/` |
|---|---|
| Network / VPC configuration and subnets | `01-vpc-subnets.png`, `02-route-tables.png`, `03-nat-igw.png` |
| Compute instances / container hosts | `04-ecs-services.png`, `05-ecs-tasks.png`, `20-ecs-task-definition.png` |
| Security groups / firewall rules | `06-security-groups.png`, `07a-sg-api-rds-rules.png`, `07b-sg-api-rds-rules.png` |
| Load balancer configuration | `08-alb.png`, `09-target-group.png`, `10-autoscaling.png` |
| Database instance | `11-rds.png` |
| Docker image build and registry listing | `12-docker-build.png`, `13-ecr-images.png` |
| CI/CD pipeline run (build and deploy) | `14-github-actions.png` |
| Running application in a browser | `15-app-landing.png` |
| Extra: S3, secrets, logs, IaC | `18-s3-bucket.png`, `19-ssm-parameters.png`, `21-cloudwatch-logs.png`, `22-terraform-output.txt` |

## 3. Source files

| File | Purpose |
|---|---|
| `apps/web/Dockerfile` | Web tier image (Next.js, multi-stage, non-root) |
| `apps/api/Dockerfile` | Application tier image (Express, multi-stage, non-root) |
| `docker-compose.yml`, `.dockerignore` | Local multi-service orchestration (web, API, PostgreSQL, MinIO) |
| `.github/workflows/ci-cd.yml` | CI/CD pipeline: build, test, push to ECR, deploy to ECS |
| `infra/terraform/` | Infrastructure as Code for the whole AWS environment (64 resources) |
| `scripts/push-images.sh`, `.ps1` | First image push to ECR (bootstrap) |

Kubernetes manifests: not applicable (the containers run on Amazon ECS Fargate).
Step-by-step reproduction guide: `docs/DEPLOYMENT.md` in the repository.
