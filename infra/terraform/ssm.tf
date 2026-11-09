resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "database_url" {
  name  = "/${local.name_prefix}/database-url"
  type  = "SecureString"
  value = local.database_url

  tags = {
    Name = "${local.name_prefix}-database-url"
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${local.name_prefix}/jwt-secret"
  type  = "SecureString"
  value = random_password.jwt.result

  tags = {
    Name = "${local.name_prefix}-jwt-secret"
  }
}
