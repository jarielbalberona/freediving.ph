terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "freedivingph-tfstate-bucket" # Change this to your S3 bucket name
    key     = "terraform.tfstate"
    region  = "ap-southeast-1" # Change to your AWS region
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
