# ---------------------------------------------------------------------------
# General
# ---------------------------------------------------------------------------

variable "project" {
  description = "Short project name used as a prefix for every resource name."
  type        = string
  default     = "pdf-toolkit"
}

variable "environment" {
  description = "Environment name appended to the prefix (for example prod)."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "github_repository" {
  description = "GitHub repository (owner/name) whose main branch may deploy through OIDC."
  type        = string
  default     = "MuhammadTalha57/pdf-toolkit"
}

# ---------------------------------------------------------------------------
# Network
# ---------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block of the VPC. Subnets are /24 slices of it."
  type        = string
  default     = "10.0.0.0/16"
}

variable "allowed_http_cidrs" {
  description = "CIDRs allowed to reach the public load balancer on port 80."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ---------------------------------------------------------------------------
# Compute (ECS Fargate)
# ---------------------------------------------------------------------------

variable "image_tag" {
  description = "Image tag ECS runs. CI pushes both 'latest' and the commit SHA."
  type        = string
  default     = "latest"
}

variable "min_tasks" {
  description = "Minimum running tasks per service (web and api)."
  type        = number
  default     = 1
}

variable "max_tasks" {
  description = "Maximum running tasks per service (web and api)."
  type        = number
  default     = 2

  validation {
    condition     = var.max_tasks >= 1 && var.max_tasks <= 10
    error_message = "max_tasks must be between 1 and 10."
  }
}

variable "cpu_target_percent" {
  description = "Average CPU utilisation the autoscaler tries to keep each service at."
  type        = number
  default     = 60
}

variable "web_cpu" {
  description = "Fargate CPU units for one web task (256 = 0.25 vCPU)."
  type        = number
  default     = 256
}

variable "web_memory" {
  description = "Fargate memory (MiB) for one web task."
  type        = number
  default     = 512
}

variable "api_cpu" {
  description = "Fargate CPU units for one api task (256 = 0.25 vCPU)."
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Fargate memory (MiB) for one api task."
  type        = number
  default     = 512
}

variable "max_upload_mb" {
  description = "Maximum PDF upload size accepted by the API, in MB."
  type        = number
  default     = 10
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention for container logs."
  type        = number
  default     = 7
}

# ---------------------------------------------------------------------------
# Database (RDS PostgreSQL)
# ---------------------------------------------------------------------------

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "pdf_toolkit"
}

variable "db_username" {
  description = "PostgreSQL master user name."
  type        = string
  default     = "pdfapp"
}

variable "db_multi_az" {
  description = "Run RDS Multi-AZ (standby in a second AZ). Roughly doubles RDS cost."
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Automated backup retention in days. 0 disables backups."
  type        = number
  default     = 1
}
