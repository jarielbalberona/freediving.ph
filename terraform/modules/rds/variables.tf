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

variable "db_user" {
  description = "Database username"
  type        = string
}

variable "db_password" {
  description = "Database password (deprecated - use secrets manager)"
  type        = string
  default     = ""
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "freedivingph"
}

variable "module_ecs_sg_id" {
  description = "ECS security group ID"
  type        = string
}

variable "module_networking_main_id" {
  description = "VPC ID"
  type        = string
}

variable "module_networking_subnet1_id" {
  description = "First subnet ID"
  type        = string
}

variable "module_networking_subnet2_id" {
  description = "Second subnet ID"
  type        = string
}

variable "module_networking_ecs_api_sg_id" {
  description = "ECS API security group ID"
  type        = string
}

variable "secrets_manager_secret_arn" {
  description = "ARN of the Secrets Manager secret for database credentials"
  type        = string
  default     = ""
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.small"
}

variable "allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage in GB"
  type        = number
  default     = 200
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}
