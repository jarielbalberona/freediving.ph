variable "environment" {
  type = string
}

variable "aws_region" {
  description = "The AWS region to deploy resources"
  type        = string
}

variable "aws_access_key" {
  type = string
}

variable "aws_secret_key" {
  type = string
}

variable "aws_s3_bucket_name" {
  description = "S3 Bucket Name"
  type        = string
}
variable "aws_s3_bucket_tfstate_name" {
  description = "S3 Bucket Name"
  type        = string
}
variable "aws_project_name" {
  description = "Project Name"
  type        = string
}

variable "project" {
  description = "Project Name"
  type        = string
}

variable "db_user" {
  description = "RDS Database username"
  type        = string
}
variable "db_password" {
  description = "RDS Database password"
  type        = string
}

variable "project_app_url" {
  description = "Project APP URL"
  type        = string
}

variable "project_api_url" {
  description = "Project API URL"
  type        = string
}
variable "project_auth_domain_cognito" {
  description = "Project Auth Domain"
  type        = string
}

variable "project_app_domain" {
  description = "Project App Domain"
  type        = string
}
variable "project_api_domain" {
  description = "Project API Domain"
  type        = string
}
variable "project_app_port" {
  description = "Project App Port"
  type        = string
}
variable "project_api_port" {
  description = "Project API Port"
  type        = string
}


