terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "freediving-ph-tofu-state"
    key            = "shared/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    kms_key_id     = "alias/terraform-state-key"
    dynamodb_table = "terraform-state-locks"
  }
}


provider "aws" {
  region = var.aws_region

  # Remove hardcoded credentials - use environment variables or IAM roles
  # access_key = var.aws_access_key
  # secret_key = var.aws_secret_key

  default_tags {
    tags = {
      Project     = var.project
      Environment = "shared"
      Owner       = "platform"
      ManagedBy   = "terraform"
    }
  }
}

data "aws_region" "current" {}
