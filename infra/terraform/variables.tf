variable "project" {
  description = "Short project name used as a resource name prefix."
  type        = string
  default     = "pdf-toolkit"
}

variable "environment" {
  description = "Environment suffix (for example prod, staging)."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zone_count" {
  description = "Number of AZs to spread the two private subnet tiers across."
  type        = number
  default     = 2

  validation {
    condition     = var.availability_zone_count >= 2 && var.availability_zone_count <= 3
    error_message = "availability_zone_count must be 2 or 3."
  }
}

variable "allowed_http_cidrs" {
  description = "CIDRs allowed to reach the public ALB. Restrict this to your IP for demos."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "certificate_arn" {
  description = "Optional ACM certificate ARN. When set, the ALB adds HTTPS and redirects HTTP to HTTPS."
  type        = string
  default     = ""
}

variable "cookie_secure" {
  description = "Set true only when the ALB serves HTTPS; otherwise browsers drop the auth cookie over HTTP."
  type        = bool
  default     = false
}

variable "desired_count" {
  description = "Number of tasks per ECS service."
  type        = number
  default     = 2

  validation {
    condition     = var.desired_count >= 1 && var.desired_count <= 10
    error_message = "desired_count must be between 1 and 10."
  }
}

variable "min_count" {
  description = "Minimum tasks per ECS service for autoscaling."
  type        = number
  default     = 2
}

variable "max_count" {
  description = "Maximum tasks per ECS service for autoscaling."
  type        = number
  default     = 4
}

variable "api_cpu" {
  description = "Fargate CPU units for the API task (256 = 0.25 vCPU)."
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Fargate memory (MiB) for the API task."
  type        = number
  default     = 512
}

variable "web_cpu" {
  description = "Fargate CPU units for the web task (512 = 0.5 vCPU)."
  type        = number
  default     = 512
}

variable "web_memory" {
  description = "Fargate memory (MiB) for the web task."
  type        = number
  default     = 1024
}

variable "image_tag" {
  description = "Container image tag deployed by ECS. CI pushes latest plus the commit SHA."
  type        = string
  default     = "latest"
}

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.micro is free-tier eligible."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GiB."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "pdf_toolkit"
}

variable "db_username" {
  description = "PostgreSQL master username."
  type        = string
  default     = "pdfapp"
}

variable "db_backup_retention_days" {
  description = "RDS automated backup retention in days (0 disables backups)."
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Enable RDS Multi-AZ. Doubles RDS cost; the free tier is Single-AZ."
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Protect the RDS instance from deletion."
  type        = bool
  default     = false
}

variable "rds_skip_final_snapshot" {
  description = "Skip the final RDS snapshot on destroy (course-friendly teardown)."
  type        = bool
  default     = true
}

variable "s3_force_destroy" {
  description = "Allow Terraform to delete a non-empty S3 bucket on destroy."
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention for ECS services."
  type        = number
  default     = 7
}

variable "max_upload_mb" {
  description = "Maximum PDF upload size in megabytes."
  type        = number
  default     = 10
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the deploy role via OIDC."
  type        = string
  default     = "MuhammadTalha57/pdf-toolkit"
}

variable "create_github_oidc" {
  description = "Create the GitHub Actions OIDC provider. Set false if the account already has one."
  type        = bool
  default     = true
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN when create_github_oidc is false."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Extra tags applied to every resource."
  type        = map(string)
  default     = {}
}
