output "app_url" {
  description = "Public URL of the ALB."
  value       = "${local.alb_scheme}://${aws_lb.main.dns_name}"
}

output "alb_dns_name" {
  description = "ALB DNS name."
  value       = aws_lb.main.dns_name
}

output "ecr_api_repository_url" {
  description = "ECR repository URL for the API image."
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_web_repository_url" {
  description = "ECR repository URL for the web image."
  value       = aws_ecr_repository.web.repository_url
}

output "s3_bucket_name" {
  description = "S3 bucket that stores uploaded and generated PDFs."
  value       = aws_s3_bucket.files.bucket
}

output "rds_address" {
  description = "RDS PostgreSQL hostname."
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS PostgreSQL port."
  value       = aws_db_instance.main.port
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "api_service_name" {
  description = "ECS API service name."
  value       = aws_ecs_service.api.name
}

output "web_service_name" {
  description = "ECS web service name."
  value       = aws_ecs_service.web.name
}

output "api_log_group" {
  description = "CloudWatch log group for the API."
  value       = aws_cloudwatch_log_group.api.name
}

output "web_log_group" {
  description = "CloudWatch log group for the web tier."
  value       = aws_cloudwatch_log_group.web.name
}

output "github_deploy_role_arn" {
  description = "Set this as the GitHub Actions repository variable AWS_ROLE_ARN."
  value       = local.github_oidc_arn != "" ? aws_iam_role.github_deploy[0].arn : ""
}

output "database_url_parameter" {
  description = "SSM SecureString parameter that holds DATABASE_URL."
  value       = aws_ssm_parameter.database_url.name
}

output "jwt_secret_parameter" {
  description = "SSM SecureString parameter that holds JWT_SECRET."
  value       = aws_ssm_parameter.jwt_secret.name
}
