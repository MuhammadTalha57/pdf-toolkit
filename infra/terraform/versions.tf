terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Local state is used by default for this course project. For a shared or
  # production setup, copy backend.tf.example to backend.tf, create the bucket
  # and lock table, then run `terraform init -migrate-state`.
}
