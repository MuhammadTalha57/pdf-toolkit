# Screenshot checklist

Capture these **after** `terraform apply`, the first ECR image push, and a
successful GitHub Actions run. Save AWS console shots under
`CEA/screenshots/aws/` with the suggested names.

**Redact before submitting:** account IDs if required by the instructor, passwords,
JWT values, `DATABASE_URL` values, access keys, and personal billing details.
Never screenshot an SSM parameter value with "Show" enabled.

## Minimum set for the report (12 shots)

| # | Page | What to show | Suggested file |
|---|---|---|---|
| 1 | VPC → Subnets | Six subnets, two per tier, two AZs | `01-vpc-subnets.png` |
| 2 | VPC → Route tables | Public → IGW, app → NAT, DB → local only | `02-route-tables.png` |
| 3 | EC2 → Security groups | The four SG rules (ALB → web → API → RDS) | `03-security-groups.png` |
| 4 | EC2 → Load balancers | Internet-facing ALB, DNS name, 2 AZs | `04-alb.png` |
| 5 | EC2 → Target groups | Web target group with 2 healthy targets | `05-target-group-healthy.png` |
| 6 | ECS → Cluster services | Web + API, 2/2 running, steady state | `06-ecs-services.png` |
| 7 | ECS → Service (API) | Service Connect namespace/service, no ALB | `07-ecs-service-connect.png` |
| 8 | ECS → Task definition | Image, env names, secret names, health check, roles | `08-ecs-task-definition.png` |
| 9 | ECR | Both repositories, `latest` + SHA tags, scan results | `09-ecr.png` |
| 10 | RDS | PostgreSQL 16, encrypted, Single-AZ, private subnet group | `10-rds.png` |
| 11 | S3 | Block Public Access, versioning, encryption, lifecycle, objects | `11-s3.png` |
| 12 | GitHub Actions | Green test + deploy jobs | `12-github-actions.png` |

## Additional evidence (recommended)

### VPC

- [ ] VPC details (`10.0.0.0/16`, DNS hostnames enabled)
- [ ] Internet gateway
- [ ] NAT gateway + Elastic IP
- [ ] S3 gateway endpoint
- [ ] Public vs private subnet route tables

### Security

- [ ] ALB SG inbound 80 (and 443 if configured)
- [ ] Web SG inbound 3000 from the ALB SG only
- [ ] API SG inbound 3000 from the web SG only
- [ ] RDS SG inbound 5432 from the API SG only
- [ ] IAM execution role + SSM/KMS policy
- [ ] IAM API task role + S3 policy
- [ ] IAM GitHub deploy role + OIDC trust
- [ ] GitHub OIDC provider
- [ ] SSM parameter **names** only (values hidden)

### ECS / ALB

- [ ] Web service details (load balancer, target group, Service Connect client)
- [ ] API service details (Service Connect server `api`, no load balancer)
- [ ] Autoscaling target and policies (CPU 60%, requests 800)
- [ ] Deployment circuit breaker enabled
- [ ] CloudWatch log streams for both services

### Databases and storage

- [ ] RDS connectivity & security tab (VPC, subnet group, SG)
- [ ] RDS configuration tab (encryption, backup retention, `rds.force_ssl`)
- [ ] S3 bucket policy (TLS-only deny)
- [ ] S3 `tmp/` and `users/<id>/results/` object layout
- [ ] S3 lifecycle rules

### CloudWatch

- [ ] Log group `/ecs/pdf-toolkit-prod/api`
- [ ] Log group `/ecs/pdf-toolkit-prod/web`
- [ ] ALB 5xx alarm and API CPU alarm
- [ ] ALB TargetResponseTime / RequestCount metric (optional)

### CI/CD

- [ ] Docker image build output and local image tags (`docker compose build`, `docker images`)
- [ ] Successful `Build and test` job
- [ ] Successful `Build, push, and deploy` job
- [ ] ECR push step log
- [ ] ECS "force new deployment" event
- [ ] `aws ecs wait services-stable` success

### Application on AWS

Use `http://<alb-dns>` and capture:

- [ ] Landing page (logged out)
- [ ] Signup page
- [ ] Logged-in landing page (navbar shows email/History/Log out)
- [ ] Merge tool after selecting two PDFs
- [ ] Merge success page
- [ ] History page with generated documents
- [ ] Download works (file opens in a PDF viewer)
- [ ] Second user sees an empty history (isolation)
- [ ] Second user gets 404/400 when trying the first user's document id
      (browser devtools network panel is acceptable evidence)

### Terraform / cost

- [ ] `terraform apply` summary (resources added)
- [ ] `terraform output` (redact sensitive values)
- [ ] AWS Budgets / Cost Explorer after the grading window
- [ ] GitHub repository variable `AWS_ROLE_ARN` (redact most of the ARN if needed)

## Already captured locally

`CEA/screenshots/local/` contains the application flow against Docker Compose:

- `01-landing-logged-out.png`
- `02-signup.png`
- `03-landing-logged-in.png`
- `04-history.png`
- `05-merge-tool.png`
- `06-merge-queued.png`
- `07-merge-success.png`
- `08-split-tool.png`
- `09-organize-tool.png`
- `10-login.png`
- `evidence-web-history.png` (side-by-side composite used in the report)

These are valid evidence of the application behavior; the AWS shots prove the
cloud deployment.
