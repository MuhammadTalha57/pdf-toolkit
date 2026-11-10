# Private bucket for uploaded and generated PDFs. New buckets are already
# encrypted (SSE-S3) and owner-enforced by default; public access is blocked
# explicitly and plain-HTTP access is denied by the bucket policy.

resource "aws_s3_bucket" "files" {
  bucket        = "${local.name}-files-${data.aws_caller_identity.current.account_id}"
  force_destroy = true # lets `terraform destroy` remove a non-empty bucket

  tags = { Name = "${local.name}-files" }
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Raw uploads live under tmp/ and are only needed until an operation runs.
resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    id     = "expire-temp-uploads"
    status = "Enabled"

    filter {
      prefix = "tmp/"
    }

    expiration {
      days = 1
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

data "aws_iam_policy_document" "files_tls_only" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.files.arn, "${aws_s3_bucket.files.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "files" {
  bucket = aws_s3_bucket.files.id
  policy = data.aws_iam_policy_document.files_tls_only.json

  depends_on = [aws_s3_bucket_public_access_block.files]
}
