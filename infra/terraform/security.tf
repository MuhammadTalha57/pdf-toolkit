# One security group per tier, chained so each tier accepts traffic only from
# the tier in front of it:
#
#   internet --80--> alb --3000--> web --3000--> api --5432--> rds
#
# Egress is limited too: tasks may reach AWS APIs over HTTPS (ECR, SSM,
# CloudWatch Logs, S3) and the next tier, nothing else. DNS to the VPC resolver
# is not filtered by security groups.

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb-sg"
  description = "Public load balancer"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-alb-sg" }
}

resource "aws_security_group" "web" {
  name        = "${local.name}-web-sg"
  description = "Web tier (Next.js) - reachable only from the ALB"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-web-sg" }
}

resource "aws_security_group" "api" {
  name        = "${local.name}-api-sg"
  description = "App tier (Express API) - reachable only from the web tier"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-api-sg" }
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds-sg"
  description = "Database tier (PostgreSQL) - reachable only from the app tier"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-rds-sg" }
}

# --- ALB --------------------------------------------------------------------

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  for_each = toset(var.allowed_http_cidrs)

  security_group_id = aws_security_group.alb.id
  description       = "HTTP from the internet"
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "alb_to_web" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward to web tasks"
  referenced_security_group_id = aws_security_group.web.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

# --- Web --------------------------------------------------------------------

resource "aws_vpc_security_group_ingress_rule" "web_from_alb" {
  security_group_id            = aws_security_group.web.id
  description                  = "HTTP from the ALB"
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_egress_rule" "web_to_api" {
  security_group_id            = aws_security_group.web.id
  description                  = "Proxy /api requests to the API"
  referenced_security_group_id = aws_security_group.api.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_egress_rule" "web_https" {
  security_group_id = aws_security_group.web.id
  description       = "HTTPS to AWS APIs (ECR, CloudWatch, ECS agent)"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

# --- API --------------------------------------------------------------------

resource "aws_vpc_security_group_ingress_rule" "api_from_web" {
  security_group_id            = aws_security_group.api.id
  description                  = "HTTP from the web tier only"
  referenced_security_group_id = aws_security_group.web.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_egress_rule" "api_to_rds" {
  security_group_id            = aws_security_group.api.id
  description                  = "PostgreSQL"
  referenced_security_group_id = aws_security_group.rds.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_vpc_security_group_egress_rule" "api_https" {
  security_group_id = aws_security_group.api.id
  description       = "HTTPS to AWS APIs (S3, ECR, SSM, CloudWatch, ECS agent)"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

# --- RDS --------------------------------------------------------------------

resource "aws_vpc_security_group_ingress_rule" "rds_from_api" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from the app tier only"
  referenced_security_group_id = aws_security_group.api.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}
