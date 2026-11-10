#!/usr/bin/env bash
# Build both images locally and push them to ECR.
#
# Needed once, for the very first deployment: ECS services cannot start until
# an image exists in ECR. After that, GitHub Actions pushes images on every
# commit to main.
#
# Usage (from the repository root, after the ECR repositories exist):
#   ./scripts/push-images.sh
#
# Requires: docker (running), aws CLI v2 (logged in), terraform.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infra/terraform"

# `tr -d '\r'` strips the carriage returns the Windows builds of terraform and
# the AWS CLI emit; without it `docker login` fails with "400 Bad Request".
tf_output() { terraform -chdir="$TF_DIR" output -raw "$1" | tr -d '\r'; }

REGISTRY="$(tf_output ecr_registry)"
# <account>.dkr.ecr.<region>.amazonaws.com -> <region>; independent of the CLI's
# default region, which may differ from the region Terraform deployed to.
REGION="$(echo "$REGISTRY" | cut -d. -f4)"
WEB_REPO="$(tf_output ecr_web_repository_url)"
API_REPO="$(tf_output ecr_api_repository_url)"
TAG="$(git -C "$ROOT" rev-parse --short HEAD)"

echo "==> Logging in to $REGISTRY"
aws ecr get-login-password --region "$REGION" | tr -d '\r' \
  | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Building and pushing API image ($TAG)"
docker build --platform linux/amd64 -f "$ROOT/apps/api/Dockerfile" \
  -t "$API_REPO:latest" -t "$API_REPO:$TAG" "$ROOT"
docker push "$API_REPO:latest"
docker push "$API_REPO:$TAG"

echo "==> Building and pushing web image ($TAG)"
docker build --platform linux/amd64 -f "$ROOT/apps/web/Dockerfile" \
  --build-arg API_INTERNAL_URL=http://api:3000 \
  --build-arg NEXT_PUBLIC_API_BASE_URL=/api \
  -t "$WEB_REPO:latest" -t "$WEB_REPO:$TAG" "$ROOT"
docker push "$WEB_REPO:latest"
docker push "$WEB_REPO:$TAG"

echo "==> Done. Images tagged latest and $TAG."
