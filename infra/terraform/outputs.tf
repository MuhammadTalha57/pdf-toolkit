output "app_url" {
  description = "Open this in a browser."
  value       = local.app_url
}

output "ecr_registry" {
  description = "ECR registry host used for docker login."
  value       = split("/", aws_ecr_repository.repo["api"].repository_url)[0]
}

output "ecr_web_repository_url" {
  description = "ECR repository for the web image."
  value       = aws_ecr_repository.repo["web"].repository_url
}

output "ecr_api_repository_url" {
  description = "ECR repository for the api image."
  value       = aws_ecr_repository.repo["api"].repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "web_service_name" {
  description = "ECS web service name."
  value       = aws_ecs_service.web.name
}

output "api_service_name" {
  description = "ECS api service name."
  value       = aws_ecs_service.api.name
}

output "github_deploy_role_arn" {
  description = "Save as the GitHub repository variable AWS_ROLE_ARN."
  value       = aws_iam_role.github_deploy.arn
}

output "s3_bucket_name" {
  description = "Bucket holding uploaded and generated PDFs."
  value       = aws_s3_bucket.files.bucket
}

output "rds_endpoint" {
  description = "Private RDS hostname (reachable only from the api tasks)."
  value       = aws_db_instance.main.address
}
