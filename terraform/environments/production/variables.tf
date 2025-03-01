variable "environment" {
  type = string
}

variable "aws_region" {
  description = "The AWS region to deploy resources"
  type        = string
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
}
variable "aws_s3_bucket_tfstate_name" {
  description = "S3 Bucket Name"
  type        = string
}

variable "project" {
  description = "Project Name"
  type        = string
}

