# Phase 2 — Terraform infrastructure

**Goal:** provision the AWS three-tier environment reproducibly, with no manual
console clicking for the core resources.

**Location:** `infra/terraform/`.

**Status:** `terraform fmt`, `terraform init -backend=false`, and
`terraform validate` pass with AWS provider `5.100.0` and Terraform `1.17.0`.
`terraform plan/apply` have **not** run yet because this machine has no AWS
credentials. Deployment is the next phase.

## File map

| File | Contents |
|---|---|
| `versions.tf` | Terraform/provider constraints |
| `providers.tf` | AWS provider + default tags |
| `variables.tf` | Region, sizing, DB, TLS, GitHub, cost knobs |
| `locals.tf` | Name prefix, AZ slice, image URLs, DB URL, ALB scheme |
| `network.tf` | VPC, 2 public + 2 app + 2 DB subnets, IGW, single NAT, route tables, S3 gateway endpoint |
| `security.tf` | Four security groups: ALB → web → api → RDS |
| `s3.tf` | Private bucket, versioning, SSE, lifecycle, TLS-only policy |
| `ecr.tf` | `api` and `web` repositories, scan-on-push, keep 10 images |
| `rds.tf` | PostgreSQL 16, DB subnet group, `rds.force_ssl=1`, random password |
| `ssm.tf` | `DATABASE_URL` and `JWT_SECRET` as SecureString parameters |
| `iam.tf` | ECS execution role, API S3 role, web task role, GitHub OIDC deploy role |
| `logs.tf` | `/ecs/pdf-toolkit-prod/{api,web}` log groups |
| `alb.tf` | Internet-facing ALB, web target group, HTTP listener, optional HTTPS |
| `ecs.tf` | Cluster, Service Connect namespace, task definitions, services, autoscaling |
| `alarms.tf` | ALB 5xx and API CPU alarms (no SNS action) |
| `outputs.tf` | App URL, ECR URLs, bucket, RDS host, role ARN, log groups |
| `terraform.tfvars.example` | Copy to `terraform.tfvars` |
| `backend.tf.example` | Optional S3 + DynamoDB remote state |
| `README.md` | Apply, image push, OIDC, HTTPS, teardown |

## Network design

- VPC `10.0.0.0/16`.
- Two AZs (default; `availability_zone_count` can be 2 or 3).
- Public subnets: `10.0.0.0/24`, `10.0.1.0/24` (ALB + NAT).
- Private app subnets: `10.0.10.0/24`, `10.0.11.0/24` (ECS tasks).
- Private DB subnets: `10.0.20.0/24`, `10.0.21.0/24` (RDS).
- One NAT Gateway + EIP in the first public subnet. Both app subnets route
  `0.0.0.0/0` through it.
- DB route table has no Internet route.
- S3 gateway endpoint attached to the app route table, so S3 traffic does not
  consume NAT data processing.
- Only the ALB has public addresses.

## Security design

- **ALB SG:** inbound 80 from `allowed_http_cidrs` (and 443 only when a
  certificate is configured); outbound all.
- **Web SG:** inbound 3000 only from the ALB SG.
- **API SG:** inbound 3000 only from the web SG.
- **RDS SG:** inbound 5432 only from the API SG; no outbound rules.
- **IAM:** execution role can pull ECR images, write logs, and read the two SSM
  parameters. The API task role can only read/write/list the document bucket. The
  web task role has no AWS permissions.
- **SSM SecureString** stores the full `DATABASE_URL` and `JWT_SECRET`; ECS
  injects them as container secrets. SecureString uses the default `alias/aws/ssm`
  key, so no customer-managed KMS key cost.
- **S3:** all public access blocked, ACLs disabled (`BucketOwnerEnforced`),
  versioning on, AES256 default encryption, and a bucket policy that denies any
  request with `aws:SecureTransport=false`.
- **RDS:** not publicly accessible, encrypted storage, `rds.force_ssl=1`. The app
  connection string uses `sslmode=require`.
- **GitHub Actions:** OIDC provider + role, no long-lived access keys. Trust is
  limited to `repo:MuhammadTalha57/pdf-toolkit` on `main` and pull requests.

## ECS / ALB design

- ECS cluster `pdf-toolkit-prod`, Fargate, Container Insights disabled for cost.
- Service Connect HTTP namespace `pdf-toolkit-prod`.
- `api` service: 0.25 vCPU / 512 MiB, registers discovery name `api` on port 3000.
  No ALB target group.
- `web` service: 0.5 vCPU / 1024 MiB, Service Connect client, ALB target group on
  port 3000. `API_INTERNAL_URL=http://api:3000`.
- Both services desired 2, min 2, max 4, spread across the two app subnets/AZs by
  the ECS scheduler.
- Autoscaling: target-tracking CPU 60% for both; additionally 800
  requests/target/minute for web.
- Deployment circuit breaker with rollback.
- ALB health check: `GET /` expecting 200; web tasks have a 60-second grace
  period. API tasks use a container health check on `/health`.
- Optional ACM certificate turns on HTTPS and an HTTP→HTTPS redirect.

## Cost decisions

| Decision | Why |
|---|---|
| One NAT Gateway | ~$33/month saved vs one per AZ; documented single point of failure |
| Fargate 256/512 (api) and 512/1024 (web) | Enough for PDF work without overpaying |
| RDS `db.t4g.micro`, Single-AZ | Free-tier eligible; Multi-AZ is a variable |
| 7-day log retention | Avoid unbounded CloudWatch cost |
| ECR keep 10 images | Avoid registry growth |
| S3 `tmp/` expires after 1 day, noncurrent versions after 30 | Bound storage |
| No Container Insights / Performance Insights | Cost; CloudWatch logs/metrics still exist |
| SSM SecureString instead of Secrets Manager | Standard parameters are free; Secrets Manager is ~$0.40/secret/month |

## Commands run

Terraform was installed with Winget. The binary was not on the current shell's
`PATH`, so the full path was used:

```bash
TF="/c/Users/muham/AppData/Local/Microsoft/WinGet/Packages/Hashicorp.Terraform_Microsoft.Winget.Source_8wekyb3d8bbwe/terraform.exe"
cd infra/terraform
"$TF" fmt -recursive
"$TF" init -backend=false -input=false
"$TF" validate
# Success! The configuration is valid.
```

## Issues hit and fixes

### 1. Service Connect schema mismatch

- **Symptom:** `terraform validate` reported
  `The argument "port_name" is required` and `An argument named "port" is not expected`
  in the API service's `service_connect_configuration`.
- **Cause:** AWS provider `5.100.0` expects the container port-mapping name, not a
  numeric port.
- **Fix:** use `port_name = "api"` (matching `portMappings.name = "api"`), keep
  `discovery_name = "api"`, and keep the client alias `dns_name = "api"`,
  `port = 3000`.

### 2. S3 lifecycle argument name

- **Symptom:** `An argument named "days_since_initiation" is not expected`.
- **Cause:** the provider schema uses `days_after_initiation`.
- **Fix:** rename both `abort_incomplete_multipart_upload` arguments.

### 3. Terraform not on PATH after Winget

- **Symptom:** `terraform: command not found` immediately after a successful
  Winget install.
- **Cause:** the installer updated the user PATH, but the existing shell had
  already captured the old environment.
- **Fix:** call the binary by its full path for this session (or open a new
  terminal). `winget` reported the package at
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Hashicorp.Terraform_*\terraform.exe`.

## Not yet done (requires AWS)

1. `cp terraform.tfvars.example terraform.tfvars` and review.
2. `terraform plan` / `terraform apply`.
3. Push the first images to the two ECR repositories (ECS cannot become healthy
   before images exist).
4. Add `AWS_ROLE_ARN` to the GitHub repository variables.
5. Capture the console screenshots listed in
   `CEA/screenshots/CHECKLIST.md`.

## State safety

Local state contains the generated DB password and JWT secret. `.gitignore`
excludes `*.tfstate*`, `terraform.tfvars`, `.terraform/`, and `backend.hcl`.
For a shared setup, copy `backend.tf.example` to `backend.tf` and migrate state to
S3 with DynamoDB locking.
