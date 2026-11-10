data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

locals {
  name = "${var.project}-${var.environment}"

  # Two AZs: enough for the ALB and RDS subnet group, and for spreading tasks.
  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  app_url = "http://${aws_lb.main.dns_name}"

  api_image = "${aws_ecr_repository.repo["api"].repository_url}:${var.image_tag}"
  web_image = "${aws_ecr_repository.repo["web"].repository_url}:${var.image_tag}"

  # TLS is enforced and the server certificate is verified against the AWS RDS
  # CA bundle, which the API Dockerfile downloads to /app/rds-global-bundle.pem.
  database_url = join("", [
    "postgres://${var.db_username}:${random_password.db.result}",
    "@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}",
    "?sslmode=verify-full&sslrootcert=/app/rds-global-bundle.pem",
  ])
}
