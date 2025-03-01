terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "freediving.ph-tofu-state"
    key     = "development/terraform.tfstate"
    region  = "ap-southeast-1"
    encrypt = true
  }
}


provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project
    }
  }
}

data "aws_region" "current" {}
