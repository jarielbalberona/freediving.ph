# Environment Configuration
variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "The AWS region to deploy resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
}

variable "aws_project_name" {
  description = "AWS Project Name"
  type        = string
  default     = "freediving-ph"
}

variable "project" {
  description = "Project Name"
  type        = string
  default     = "freediving-ph"
}

# Domain Configuration
variable "zone_name" {
  description = "Root domain name (e.g., freediving.ph)"
  type        = string
  default     = "freediving.ph"
}

variable "project_app_domain" {
  description = "Project App Domain"
  type        = string
  default     = "app.dev"
}

variable "project_api_domain" {
  description = "Project API Domain"
  type        = string
  default     = "api.dev"
}

variable "project_app_url" {
  description = "Project APP URL"
  type        = string
  default     = "https://app.dev.freediving.ph"
}

variable "project_api_url" {
  description = "Project API URL"
  type        = string
  default     = "https://api.dev.freediving.ph"
}

variable "project_app_port" {
  description = "Project App Port"
  type        = number
  default     = 3000
}

variable "project_api_port" {
  description = "Project API Port"
  type        = number
  default     = 4000
}

# Database Configuration
variable "db_user" {
  description = "RDS Database username"
  type        = string
  default     = "freedivingphuser"
}

variable "db_name" {
  description = "RDS Database name"
  type        = string
  default     = "freedivingph"
}

# API Keys (optional)
variable "api_keys" {
  description = "Map of API keys to store in SSM"
  type        = map(string)
  default     = {}
}

# VPC Configuration
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

variable "enable_cloudfront_cert" {
  description = "Enable CloudFront certificate (us-east-1)"
  type        = bool
  default     = false
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.small"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage in GB"
  type        = number
  default     = 200
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "rds_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false  # Disabled for dev
}

variable "rds_performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "rds_monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}

# ECS API Configuration
variable "api_cpu" {
  description = "CPU units for API task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory for API task in MB"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 2
}

variable "api_task_role_policies" {
  description = "List of IAM policy ARNs to attach to API task role"
  type        = list(string)
  default     = []
}

variable "api_execution_role_policies" {
  description = "List of IAM policy ARNs to attach to API execution role"
  type        = list(string)
  default     = []
}

variable "api_health_check_grace_period" {
  description = "Health check grace period in seconds for API"
  type        = number
  default     = 300
}

variable "api_deployment_circuit_breaker" {
  description = "Enable deployment circuit breaker for API"
  type        = bool
  default     = true
}

variable "api_deployment_rollback" {
  description = "Enable automatic rollback on deployment failure for API"
  type        = bool
  default     = true
}

variable "api_enable_autoscaling" {
  description = "Enable auto scaling for API"
  type        = bool
  default     = true
}

variable "api_min_capacity" {
  description = "Minimum number of API tasks"
  type        = number
  default     = 1
}

variable "api_max_capacity" {
  description = "Maximum number of API tasks"
  type        = number
  default     = 10
}

variable "api_target_cpu_utilization" {
  description = "Target CPU utilization for API auto scaling"
  type        = number
  default     = 70
}

variable "api_target_memory_utilization" {
  description = "Target memory utilization for API auto scaling"
  type        = number
  default     = 80
}

variable "api_log_retention_days" {
  description = "CloudWatch log retention in days for API"
  type        = number
  default     = 7
}

variable "api_enable_logging" {
  description = "Enable CloudWatch logging for API"
  type        = bool
  default     = true
}

# ECS App Configuration
variable "app_cpu" {
  description = "CPU units for App task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "app_memory" {
  description = "Memory for App task in MB"
  type        = number
  default     = 1024
}

variable "app_desired_count" {
  description = "Desired number of App tasks"
  type        = number
  default     = 2
}

variable "app_task_role_policies" {
  description = "List of IAM policy ARNs to attach to App task role"
  type        = list(string)
  default     = []
}

variable "app_execution_role_policies" {
  description = "List of IAM policy ARNs to attach to App execution role"
  type        = list(string)
  default     = []
}

variable "app_health_check_grace_period" {
  description = "Health check grace period in seconds for App"
  type        = number
  default     = 300
}

variable "app_deployment_circuit_breaker" {
  description = "Enable deployment circuit breaker for App"
  type        = bool
  default     = true
}

variable "app_deployment_rollback" {
  description = "Enable automatic rollback on deployment failure for App"
  type        = bool
  default     = true
}

variable "app_enable_autoscaling" {
  description = "Enable auto scaling for App"
  type        = bool
  default     = true
}

variable "app_min_capacity" {
  description = "Minimum number of App tasks"
  type        = number
  default     = 1
}

variable "app_max_capacity" {
  description = "Maximum number of App tasks"
  type        = number
  default     = 10
}

variable "app_target_cpu_utilization" {
  description = "Target CPU utilization for App auto scaling"
  type        = number
  default     = 70
}

variable "app_target_memory_utilization" {
  description = "Target memory utilization for App auto scaling"
  type        = number
  default     = 80
}

variable "app_log_retention_days" {
  description = "CloudWatch log retention in days for App"
  type        = number
  default     = 7
}

variable "app_enable_logging" {
  description = "Enable CloudWatch logging for App"
  type        = bool
  default     = true
}
