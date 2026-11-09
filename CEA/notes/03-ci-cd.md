# Phase 3 — CI/CD with GitHub Actions and OIDC

**File:** `.github/workflows/ci-cd.yml`

**Status:** workflow written; not executed yet. It needs the AWS stack applied and
the repository variable `AWS_ROLE_ARN` set.

## Triggers

- `pull_request` to `main`: test job only.
- `push` to `main`: test job, then deploy job.

A concurrency group cancels superseded runs on the same ref.

## Job 1 — Build and test

Runs on `ubuntu-latest`, Node 20 with npm cache:

```bash
npm ci
npm run check-types
npm test --workspace api
npm run build
```

This is the same set of checks used locally (18 API tests, web type-check and
production build). A failure stops the deploy job.

## Job 2 — Build, push, and deploy

Runs only on `push` to `main`, after `test` succeeds, under the GitHub
`production` environment.

1. `aws-actions/configure-aws-credentials@v4` assumes the Terraform-created role
   with `role-to-assume: ${{ vars.AWS_ROLE_ARN }}`. No AWS access keys are stored
   in GitHub.
2. Resolves the ECR registry from `aws sts get-caller-identity`.
3. Logs in with `aws-actions/amazon-ecr-login@v2`.
4. Sets up Docker Buildx.
5. Builds and pushes both images, tagged `latest` and `${{ github.sha }}`, with
   GitHub Actions layer cache (`type=gha`).
6. `aws ecs update-service --force-new-deployment` for both services.
7. `aws ecs wait services-stable` for both services.

The web image is built with:

```text
API_INTERNAL_URL=http://api:3000
NEXT_PUBLIC_API_BASE_URL=/api
```

so the Next.js standalone server rewrites `/api/*` to the API service through
ECS Service Connect.

## Why force-new-deployment instead of registering a new task definition?

Terraform owns the task definitions and always deploys the `latest` tag. CI only
replaces the image behind that tag and forces ECS to start new tasks. This keeps
the pipeline small and avoids giving CI `iam:PassRole` and
`ecs:RegisterTaskDefinition` permissions. Each push also stores an immutable
`github.sha` tag for traceability and manual rollback.

Trade-off: Terraform does not know the exact image digest. The SHA tag is the
audit trail, and a rollback is `docker pull <repo>:<sha>` followed by a re-tag and
force deployment (or change `image_tag` in Terraform).

## Required GitHub configuration

After `terraform apply`:

- Repository → Settings → Secrets and variables → Actions → **Variables**
- Name: `AWS_ROLE_ARN`
- Value: output `github_deploy_role_arn`

If `gh` is installed, the equivalent is:

```bash
gh variable set AWS_ROLE_ARN --body "$(terraform output -raw github_deploy_role_arn)"
```

## OIDC trust

Terraform creates:

- `aws_iam_openid_connect_provider.github`
- `aws_iam_role.github_deploy` with trust conditions:
  - `aud` = `sts.amazonaws.com`
  - `sub` = `repo:MuhammadTalha57/pdf-toolkit:ref:refs/heads/main`
    or `repo:MuhammadTalha57/pdf-toolkit:pull_request`

The role can only push to the two ECR repositories and update the two ECS
services. It cannot create infrastructure or read application secrets.

If the AWS account already has a GitHub OIDC provider, set
`create_github_oidc = false` and pass `github_oidc_provider_arn` instead.

## Issues hit and fixes

### Docker Buildx / cache setup

- **Risk:** `cache-to: type=gha` requires a Buildx builder with the GitHub Actions
  cache backend.
- **Fix:** added `docker/setup-buildx-action@v3` before the build steps.

### Environment-specific values

The workflow hard-codes the resource names from Terraform's defaults
(`pdf-toolkit-prod`, `pdf-toolkit-prod-api`, `pdf-toolkit-prod-web`, `us-east-1`).
If the project/environment/region variables change, update the `env:` block (or
move them to repository variables).

## Verification after deployment

1. Push a commit to `main`.
2. Confirm the `Build and test` job is green.
3. Confirm the `Build, push, and deploy` job is green.
4. In ECS, confirm a new deployment started and both services reached steady state.
5. In ECR, confirm `latest` and the commit SHA tags exist.
6. Open the ALB URL and run the manual smoke flow.
7. Check CloudWatch log groups for new log streams.
