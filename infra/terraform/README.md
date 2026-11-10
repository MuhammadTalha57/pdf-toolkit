# Infrastructure (Terraform)

Everything the application needs in AWS, in one root module (64 resources).
For the full first-time procedure see **[docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)**.

## Files

| File | Contents |
|---|---|
| `versions.tf` | Terraform/provider versions, AWS provider with default tags |
| `variables.tf` | All inputs (see below) |
| `locals.tf` | Naming, AZ selection, image URIs, the database URL |
| `network.tf` | VPC, 2 public + 2 private subnets, IGW, NAT gateway, route tables, S3 gateway endpoint |
| `security.tf` | Security groups per tier and their rules |
| `alb.tf` | Application Load Balancer, web target group, HTTP listener |
| `ecs.tf` | Cluster, Service Connect namespace, log groups, task definitions, services, autoscaling |
| `ecr.tf` | `web` and `api` repositories with scan-on-push and a keep-10 lifecycle |
| `rds.tf` | PostgreSQL 16 instance, subnet group, generated secrets in SSM |
| `s3.tf` | Private files bucket, public access block, `tmp/` expiry, TLS-only policy |
| `iam.tf` | ECS execution role, API task role, GitHub Actions OIDC deploy role |
| `outputs.tf` | App URL, ECR URLs, deploy role ARN, names |

## Resources at a glance

| Layer | Resources |
|---|---|
| Network | VPC `10.0.0.0/16`; public `10.0.0.0/24`, `10.0.1.0/24`; private `10.0.10.0/24`, `10.0.11.0/24`; IGW; 1 NAT gateway + EIP; public and private route tables; S3 gateway endpoint |
| Load balancing | Internet-facing ALB (2 AZs), target group `web` (IP targets, health check `/`), listener :80 |
| Compute | ECS cluster; Fargate services `web` and `api` (0.25 vCPU / 0.5 GB each) in private subnets; Service Connect; CPU target-tracking autoscaling, 1–2 tasks per service |
| Data | RDS PostgreSQL 16 `db.t4g.micro`, 20 GiB gp3, encrypted, private, TLS enforced; S3 bucket |
| Registry | ECR `pdf-toolkit-prod-web`, `pdf-toolkit-prod-api` |
| Security | 4 security groups (ALB → web → api → RDS); SSM SecureString `database-url`, `jwt-secret`; 3 IAM roles |
| Logging | CloudWatch log groups `/ecs/pdf-toolkit-prod/{web,api}` (7 days) |

## Variables

| Name | Default | Notes |
|---|---|---|
| `aws_region` | `us-east-1` | Also hard-coded in the CI workflow `env` |
| `project`, `environment` | `pdf-toolkit`, `prod` | Resource prefix `pdf-toolkit-prod`; CI uses these names |
| `github_repository` | `MuhammadTalha57/pdf-toolkit` | Only its `main` branch may assume the deploy role |
| `vpc_cidr` | `10.0.0.0/16` | |
| `allowed_http_cidrs` | `["0.0.0.0/0"]` | Who may reach the ALB |
| `image_tag` | `latest` | Set to a commit SHA to pin/roll back |
| `min_tasks`, `max_tasks` | `1`, `2` | Per service |
| `cpu_target_percent` | `60` | Autoscaling target |
| `web_cpu`, `web_memory`, `api_cpu`, `api_memory` | `256`, `512` | Fargate sizes |
| `max_upload_mb` | `10` | |
| `log_retention_days` | `7` | |
| `db_instance_class` | `db.t4g.micro` | |
| `db_allocated_storage` | `20` | GiB |
| `db_name`, `db_username` | `pdf_toolkit`, `pdfapp` | Password is generated |
| `db_multi_az` | `false` | `true` adds a standby in a second AZ |
| `db_backup_retention_days` | `1` | |

If you change `project`, `environment` or `aws_region`, update the matching
names in the `env:` block of `.github/workflows/ci-cd.yml`.

## Everyday commands

```bash
terraform plan                  # preview changes
terraform apply                 # apply changes
terraform output                # show outputs
terraform destroy               # delete everything
```

## Notes

- **State** is local (`terraform.tfstate`, git-ignored) and contains the
  generated DB password and JWT secret. Keep it private. For a team, move it to
  an S3 backend with locking.
- `desired_count` is ignored after creation because the autoscaler owns it.
- The RDS instance skips the final snapshot and has deletion protection off so
  the demo stack can be destroyed cleanly. Change both for real data.
- The GitHub OIDC identity provider is looked up, not created: it is
  account-wide and created once (deployment guide step 3.3).
