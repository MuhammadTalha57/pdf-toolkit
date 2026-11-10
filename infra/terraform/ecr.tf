resource "aws_ecr_repository" "repo" {
  for_each = toset(["web", "api"])

  name                 = "${local.name}-${each.key}"
  image_tag_mutability = "MUTABLE" # 'latest' is moved on every deploy
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${local.name}-${each.key}" }
}

# Keep only the 10 most recent images to cap storage cost.
resource "aws_ecr_lifecycle_policy" "repo" {
  for_each = aws_ecr_repository.repo

  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
