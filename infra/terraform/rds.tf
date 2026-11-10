# PostgreSQL 16 on RDS, in the private subnets, not publicly accessible.
# RDS for PostgreSQL 15+ sets rds.force_ssl=1 by default, so unencrypted
# connections are refused without needing a custom parameter group.

data "aws_rds_engine_version" "postgres" {
  engine  = "postgres"
  version = "16"
  latest  = true
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name}-db-subnets" }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name}-db"
  engine         = "postgres"
  engine_version = data.aws_rds_engine_version.postgres.version
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = var.db_multi_az

  backup_retention_period    = var.db_backup_retention_days
  auto_minor_version_upgrade = true

  # Demo-friendly teardown: `terraform destroy` removes the DB without a
  # final snapshot. Flip both for a real production database.
  skip_final_snapshot = true
  deletion_protection = false

  lifecycle {
    # Minor upgrades are applied by AWS; don't let a newer "latest" force a change.
    ignore_changes = [engine_version]
  }

  tags = { Name = "${local.name}-db" }
}

# ---------------------------------------------------------------------------
# Application secrets (SSM Parameter Store, SecureString, encrypted with KMS).
# Generated here, injected into the API container by ECS at start-up, and never
# written to the image, the repository or the CI pipeline.
# ---------------------------------------------------------------------------

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "database_url" {
  name  = "/${local.name}/database-url"
  type  = "SecureString"
  value = local.database_url
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${local.name}/jwt-secret"
  type  = "SecureString"
  value = random_password.jwt.result
}
