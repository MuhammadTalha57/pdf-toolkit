# AWS infrastructure (Terraform)

This directory provisions the three-tier deployment:

- **Web tier:** Next.js on ECS Fargate, behind a public Application Load Balancer.
- **App tier:** Express API on ECS Fargate, reachable only from the web tier via
  ECS Service Connect (`http://api:3000`).
- **Data tier:** RDS PostgreSQL in private subnets, plus an S3 bucket for PDFs.

The API and web tasks run in private subnets. Only the ALB has a public address.

## Prerequisites

- Terraform >= 1.6
- AWS credentials with permission to create VPC, ECS, ECR, RDS, S3, IAM, SSM,
  CloudWatch, and ELB resources
- Docker (to build and push the two images)

## 1. Apply the infrastructure

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
```

Save the outputs:

```bash
terraform output
terraform output -raw ecr_api_repository_url
terraform output -raw ecr_web_repository_url
terraform output -raw app_url
terraform output -raw github_deploy_role_arn
```

## 2. Build and push the first images

ECS starts with the `latest` tag. Build both images and push them before the
services can become healthy.

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com"

aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin "$REGISTRY"

# Run from the repository root (context must include package.json and packages/).
docker build -f apps/api/Dockerfile -t "$REGISTRY/pdf-toolkit-prod-api:latest" .
docker push "$REGISTRY/pdf-toolkit-prod-api:latest"

docker build -f apps/web/Dockerfile \
  --build-arg API_INTERNAL_URL=http://api:3000 \
  --build-arg NEXT_PUBLIC_API_BASE_URL=/api \
  -t "$REGISTRY/pdf-toolkit-prod-web:latest" .
docker push "$REGISTRY/pdf-toolkit-prod-web:latest"
```

If the services started before the images existed, restart them:

```bash
aws ecs update-service --cluster pdf-toolkit-prod --service pdf-toolkit-prod-api --force-new-deployment
aws ecs update-service --cluster pdf-toolkit-prod --service pdf-toolkit-prod-web --force-new-deployment
```

Open the `app_url` output. Sign up, upload a PDF, merge/split/organize it, and
check the per-user history before downloading the result.

## 3. Enable GitHub Actions deployments

The stack creates an IAM OIDC role that trusts
`repo:MuhammadTalha57/pdf-toolkit` on `main` and pull requests. Add the role ARN
as a GitHub repository variable:

- **Settings -> Secrets and variables -> Actions -> Variables**
- Name: `AWS_ROLE_ARN`
- Value: `terraform output -raw github_deploy_role_arn`

The workflow `.github/workflows/ci-cd.yml` then:

1. Installs dependencies, type-checks, tests the API, and builds both apps.
2. On `main`, assumes the role with OIDC, pushes both images, and forces new ECS
   deployments.

No long-lived AWS access keys are stored in GitHub.

## 4. HTTPS (optional)

The default listener is HTTP on port 80. Browsers will not send the auth cookie
over HTTP if `COOKIE_SECURE=true`, so the default ECS task sets
`COOKIE_SECURE=false`.

To use HTTPS:

1. Request/import an ACM certificate in the same region.
2. Set `certificate_arn` in `terraform.tfvars`.
3. Set `cookie_secure = true`.
4. `terraform apply`.

The ALB then redirects port 80 to 443 and serves HTTPS on 443.

## 5. Remote state (recommended for a team)

Copy `backend.tf.example` to `backend.tf`, replace the bucket/table names, create
the bucket and DynamoDB table, then run `terraform init -migrate-state`.

Local state contains the generated database password and JWT secret. Never commit
`terraform.tfstate` or `terraform.tfstate.backup`.

## 6. Teardown

```bash
terraform destroy
```

The defaults (`s3_force_destroy = true`, `rds_skip_final_snapshot = true`) make
the course deployment easy to remove. Remove those defaults for production data.
