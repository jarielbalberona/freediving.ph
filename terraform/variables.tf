variable "aws_region" {
  description = "The AWS region to deploy resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_s3_bucket_tfstate_name" {
  description = "S3 Bucket Name for Terraform state"
  type        = string
  default     = "freediving-ph-tofu-state"
}

variable "project" {
  description = "Project Name"
  type        = string
  default     = "freediving-ph"
}

