variable "environment" {
  type = string
}

variable "aws_region" {
  description = "The AWS region to deploy resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_access_key" {
  type    = string
  default = ""
}

variable "aws_secret_key" {
  type    = string
  default = ""
}

variable "aws_s3_bucket_name" {
  description = "S3 Bucket Name"
  type        = string
  default     = "freediving.ph"
}
variable "aws_s3_bucket_tfstate_name" {
  description = "S3 Bucket Name"
  type        = string
  default     = "freediving.ph"
}

variable "project" {
  description = "Project Name"
  type        = string
  default     = "freedivingph"
}

