# Deploying PDF Toolkit to AWS — step by step

This guide takes you from an empty AWS account to the running application, with
automated deployments from GitHub. Follow the steps in order. Every command is
meant to be copied as-is.

- **Time:** about 45 minutes the first time (most of it is waiting for RDS).
- **Cost:** roughly **$3–4 per day** while the stack is running (NAT gateway,
  load balancer, RDS and two small Fargate tasks). Run `terraform destroy`
  ([step 12](#12-tear-everything-down)) when you are done.
- **Shell:** commands are written for **bash**. On Windows use **Git Bash**
  (installed with Git for Windows); PowerShell variants are given where they
  differ.

## What you will build

```
                        Internet
                           │ HTTP :80
┌──────────────────────────┼──────────────────── VPC 10.0.0.0/16 ─────────┐
│  Public subnets          ▼                (2 AZs)                       │
│  10.0.0.0/24        ┌─────────┐        ┌─────────────┐                   │
│  10.0.1.0/24        │   ALB   │        │ NAT gateway │──► Internet GW    │
│                     └────┬────┘        └──────▲──────┘                   │
│  ────────────────────────┼────────────────────┼───────────────────────── │
│  Private subnets         │ :3000              │ outbound (ECR, SSM, logs)│
│  10.0.10.0/24            ▼                    │                          │
│  10.0.11.0/24   ┌──────────────┐  :3000  ┌──────────────┐  :5432  ┌─────┐│
│                 │ web (Next.js)│ ──────► │ api (Express)│ ──────► │ RDS ││
│                 │ ECS Fargate  │ Service │ ECS Fargate  │   TLS   │ PG16││
│                 └──────────────┘ Connect └──────┬───────┘         └─────┘│
│                                                 │ S3 gateway endpoint    │
└─────────────────────────────────────────────────┼────────────────────────┘
                                                  ▼
                                             S3 bucket (PDFs)

GitHub Actions ──(OIDC)──► ECR (web, api images) ──► ECS rolling deploy
```

All of it is defined in [`infra/terraform`](../infra/terraform) (64 resources).

---

## 1. Install the tools

| Tool | Version | Check with |
|---|---|---|
| Git | any | `git --version` |
| Node.js | 20 or newer | `node --version` |
| Docker Desktop | running | `docker info` |
| Terraform | 1.6 or newer | `terraform version` |
| AWS CLI | v2 | `aws --version` |
| GitHub CLI (optional, makes step 9 easier) | any | `gh --version` |

**Windows** (PowerShell):

```powershell
winget install Git.Git OpenJS.NodeJS.LTS Docker.DockerDesktop Hashicorp.Terraform Amazon.AWSCLI GitHub.cli
```

**macOS:**

```bash
brew install git node terraform awscli gh && brew install --cask docker
```

Close and reopen the terminal afterwards so the new tools are on `PATH`, then
start Docker Desktop.

## 2. Get the code

If you will deploy from your own GitHub account, **fork** the repository first
(the CI/CD pipeline runs in the repository you push to). Then clone it:

```bash
git clone https://github.com/<your-github-user>/pdf-toolkit.git
cd pdf-toolkit
```

## 3. Prepare the AWS account

### 3.1 Create deployment credentials

In the AWS console: **IAM → Users → Create user**, name it
`pdf-toolkit-deployer`, choose **Attach policies directly → AdministratorAccess**
(Terraform creates IAM roles, a VPC, RDS and more, so it needs broad rights).
Open the user → **Security credentials → Create access key → Command Line
Interface**, and keep the key ID and secret for the next command.

> These keys stay on your machine only. GitHub never gets AWS keys; it uses
> OIDC (step 3.3).

### 3.2 Configure the AWS CLI

```bash
aws configure
```

Enter the access key ID, the secret, region `us-east-1`, output `json`. Verify:

```bash
aws sts get-caller-identity
```

You should see your account ID and the `pdf-toolkit-deployer` ARN.

> If you already had the AWS CLI set up with another default region, make
> `us-east-1` the region for this terminal so the `aws` commands in this guide
> look in the right place: `export AWS_REGION=us-east-1` (PowerShell:
> `$env:AWS_REGION = "us-east-1"`). Terraform always uses the region in its own
> variables.

### 3.3 Register GitHub as an identity provider (once per AWS account)

GitHub Actions authenticates to AWS with short-lived OIDC tokens. The account
needs the GitHub identity provider exactly once. Check whether it already
exists:

```bash
aws iam list-open-id-connect-providers
```

If the output does **not** contain `token.actions.githubusercontent.com`,
create it:

```bash
aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com
```

Terraform looks this provider up and creates a deploy role that only the `main`
branch of your repository can assume.

## 4. (Optional) Run the stack locally first

This proves the images build and the app works before you spend money on AWS.
It starts PostgreSQL, MinIO (a local S3 stand-in), the API and the web app:

```bash
docker compose up --build
```

Open http://localhost:3000, sign up, and merge two PDFs. Stop with `Ctrl+C`,
then `docker compose down -v`.

## 5. Configure Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Open `terraform.tfvars` and set `github_repository` to **your** repository,
for example `"your-github-user/pdf-toolkit"`. Leave everything else as is for a
first deployment. (All variables are documented in
[`infra/terraform/README.md`](../infra/terraform/README.md).)

Download the providers:

```bash
terraform init
```

> Terraform keeps its state in `infra/terraform/terraform.tfstate` on your
> machine. It contains the generated database password, is git-ignored, and is
> needed later to update or destroy the stack — don't delete it.

## 6. Create the image registries (stage 1 of 2)

ECS cannot start a service until its image exists, so the two ECR repositories
are created first, on their own:

```bash
terraform apply -target=aws_ecr_repository.repo
```

Type `yes`. Terraform prints a warning about `-target`; that is expected for
this one bootstrap step.

## 7. Build and push the first images

From the **repository root**, with Docker running:

**macOS / Linux:**

```bash
cd ../..
./scripts/push-images.sh
```

**Windows** — the bash script works in Git Bash; from PowerShell use:

```powershell
cd ..\..
.\scripts\push-images.ps1
```

If PowerShell refuses to run scripts, allow it for this window only:
`Set-ExecutionPolicy -Scope Process Bypass`.

The script logs Docker in to ECR, builds the API and web images, and pushes them
tagged `latest` and with the current commit SHA. The first build takes 5–10
minutes.

Check that both images are there:

```bash
aws ecr list-images --repository-name pdf-toolkit-prod-api
aws ecr list-images --repository-name pdf-toolkit-prod-web
```

## 8. Create the rest of the infrastructure (stage 2 of 2)

```bash
cd infra/terraform
terraform apply
```

Review the plan (about 60 resources to add) and type `yes`. This takes
**10–15 minutes**; RDS is the slowest part. Terraform waits until both ECS
services are healthy before it finishes, then prints the outputs:

```
app_url                = "http://pdf-toolkit-prod-alb-123456789.us-east-1.elb.amazonaws.com"
github_deploy_role_arn = "arn:aws:iam::123456789012:role/pdf-toolkit-prod-github-deploy"
...
```

Open `app_url` in a browser. Sign up, upload PDFs, merge/split/organize them,
open **History**, and download a result. The API creates its database tables
automatically on first start.

> Use the `http://` URL exactly as printed. The demo load balancer has no TLS
> certificate, so the login cookie is sent over HTTP. For real use, add an ACM
> certificate and an HTTPS listener, then set `COOKIE_SECURE=true`.

## 9. Connect GitHub Actions

The pipeline needs one value: the ARN of the deploy role. It is not a secret
(the role can only be assumed from your repository's `main` branch), so it is
stored as a repository **variable**.

With the GitHub CLI (from `infra/terraform`):

```bash
gh auth login
gh variable set AWS_ROLE_ARN --body "$(terraform output -raw github_deploy_role_arn)"
```

Or in the browser: **repository → Settings → Secrets and variables → Actions →
Variables → New repository variable**, name `AWS_ROLE_ARN`, value from
`terraform output -raw github_deploy_role_arn`.

Also make sure **Settings → Actions → General → Allow all actions** is enabled.

## 10. Deploy through the pipeline

Every push to `main` now runs [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml):

1. **Build and test** — `npm ci`, type-check, API unit tests, production build,
   `terraform fmt -check` and `terraform validate`.
2. **Push images and deploy** (main only) — assume the AWS role via OIDC, build
   both images, push `latest` and `<commit-sha>` to ECR, force a new ECS
   deployment of both services, and wait until they are stable.

Trigger it with any commit, or manually:

```bash
gh workflow run ci-cd.yml --ref main
gh run watch
```

Pull requests run only the first job, so nothing is deployed until code reaches
`main`.

## 11. Changing the deployment

All changes go through `terraform.tfvars` followed by `terraform apply`.

| Want to… | Set in `terraform.tfvars` |
|---|---|
| Allow more instances under load | `max_tasks = 4` |
| Always run two of each (higher availability) | `min_tasks = 2` |
| Scale out sooner | `cpu_target_percent = 40` |
| Give tasks more CPU/memory | `web_cpu = 512`, `web_memory = 1024` (same for `api_*`) |
| Restrict access to your IP | `allowed_http_cidrs = ["203.0.113.7/32"]` |
| Add a database standby in a second AZ | `db_multi_az = true` |

**Roll back** to an earlier build: every image is also tagged with its commit
SHA. Set `image_tag = "<sha>"` and `terraform apply`; set it back to `"latest"`
afterwards so the pipeline takes over again. Alternatively, `git revert` the bad
commit and push.

**Logs:**

```bash
aws logs tail /ecs/pdf-toolkit-prod/api --follow
aws logs tail /ecs/pdf-toolkit-prod/web --follow
```

## 12. Tear everything down

```bash
cd infra/terraform
terraform destroy
```

Type `yes`. This removes every resource, including the images in ECR and the
files in S3 (about 10 minutes). The GitHub OIDC provider from step 3.3 is not
managed by Terraform and stays (it costs nothing). Confirm nothing billable is
left:

```bash
aws ecs list-clusters
aws rds describe-db-instances --query "DBInstances[].DBInstanceIdentifier"
aws ec2 describe-nat-gateways --filter Name=state,Values=available --query "NatGateways[].NatGatewayId"
```

All three should return empty lists.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `terraform apply` fails with *no matching IAM OpenID Connect provider* | Step 3.3 was skipped. Create the provider and apply again. |
| Stage 2 apply hangs on `aws_ecs_service`, tasks show `CannotPullContainerError` | Images were not pushed. Run step 7, then `terraform apply` again. |
| `./scripts/push-images.sh: bad interpreter` / `$'\r'` errors | The script was checked out with Windows line endings. Run `git config core.autocrlf false`, then `git checkout -- scripts/push-images.sh`. |
| `docker login` fails with `400 Bad Request` | The ECR token was requested for a different region than the registry. The scripts derive the region from the registry; for manual commands pass `--region us-east-1`. |
| `aws` commands report *Cluster not found* / empty results | Your CLI default region isn't `us-east-1`. Run `export AWS_REGION=us-east-1` (PowerShell: `$env:AWS_REGION = "us-east-1"`) in the terminal you use. |
| `permission denied` running the script | `chmod +x scripts/push-images.sh` (or `bash scripts/push-images.sh`). |
| GitHub Actions: *Not authorized to perform sts:AssumeRoleWithWebIdentity* | `github_repository` in `terraform.tfvars` doesn't match the repository running the workflow, or the run isn't on `main`. Fix and `terraform apply`. |
| GitHub Actions: *Credentials could not be loaded* | The `AWS_ROLE_ARN` variable is missing (step 9). |
| Deploy job fails at *Wait for services to become stable* | A new task failed its health check and ECS rolled back. Read the logs (step 11) and the service's **Events** tab. |
| You sign in but are immediately signed out | Open the `http://` URL, not `https://`; the demo ALB has no certificate. |
| The ALB returns `503` | No healthy web tasks yet. Wait a minute after a deploy; check **Target groups → Targets**. |
| `Error acquiring the state lock` | A previous Terraform command was interrupted. Make sure none is running, then `terraform force-unlock <id>`. |
