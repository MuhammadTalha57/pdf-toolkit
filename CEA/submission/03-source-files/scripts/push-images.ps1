# Windows (PowerShell) version of push-images.sh.
#
# Builds both images locally and pushes them to ECR. Needed once, for the very
# first deployment; afterwards GitHub Actions pushes images on every commit to
# main.
#
# Usage (from the repository root, after the ECR repositories exist):
#   .\scripts\push-images.ps1
#
# Requires: Docker Desktop (running), AWS CLI v2 (configured), Terraform.
$ErrorActionPreference = "Stop"

$Root  = Split-Path -Parent $PSScriptRoot
$TfDir = Join-Path $Root "infra/terraform"

function Get-TfOutput([string]$Name) {
    (terraform "-chdir=$TfDir" output -raw $Name).Trim()
}

function Invoke-Checked([scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Command" }
}

$Registry = Get-TfOutput "ecr_registry"
# <account>.dkr.ecr.<region>.amazonaws.com -> <region>
$Region   = $Registry.Split(".")[3]
$WebRepo  = Get-TfOutput "ecr_web_repository_url"
$ApiRepo  = Get-TfOutput "ecr_api_repository_url"
$Tag      = (git -C $Root rev-parse --short HEAD).Trim()

Write-Host "==> Logging in to $Registry"
Invoke-Checked { aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $Registry }

Write-Host "==> Building and pushing API image ($Tag)"
Invoke-Checked { docker build --platform linux/amd64 -f "$Root/apps/api/Dockerfile" -t "${ApiRepo}:latest" -t "${ApiRepo}:$Tag" $Root }
Invoke-Checked { docker push "${ApiRepo}:latest" }
Invoke-Checked { docker push "${ApiRepo}:$Tag" }

Write-Host "==> Building and pushing web image ($Tag)"
Invoke-Checked { docker build --platform linux/amd64 -f "$Root/apps/web/Dockerfile" --build-arg API_INTERNAL_URL=http://api:3000 --build-arg NEXT_PUBLIC_API_BASE_URL=/api -t "${WebRepo}:latest" -t "${WebRepo}:$Tag" $Root }
Invoke-Checked { docker push "${WebRepo}:latest" }
Invoke-Checked { docker push "${WebRepo}:$Tag" }

Write-Host "==> Done. Images tagged latest and $Tag."
