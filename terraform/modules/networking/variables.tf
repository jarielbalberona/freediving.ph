variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "project" {
  description = "Project name"
  type        = string
}

variable "aws_project_name" {
  description = "AWS project name"
  type        = string
}

variable "project_app_domain" {
  description = "Application domain"
  type        = string
}

variable "project_api_domain" {
  description = "API domain"
  type        = string
}

variable "module_route53_acm_certificate_ssl_cert" {
  description = "ACM certificate ARN for SSL"
  type        = string
}

variable "module_rds_aws_security_group_id" {
  description = "RDS security group ID"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b"]
}

variable "enable_nat" {
  description = "Enable NAT Gateway (costs ~$45/month per AZ)"
  type        = bool
  default     = true
}

variable "enable_vpc_endpoints" {
  description = "Enable VPC endpoints to reduce NAT costs"
  type        = bool
  default     = true
}

