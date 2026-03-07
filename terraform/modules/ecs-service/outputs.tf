# ECS Cluster outputs
output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

# ECR Repository outputs
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.main.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.main.arn
}

# ECS Service outputs
output "service_id" {
  description = "ID of the ECS service"
  value       = aws_ecs_service.main.id
}

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.main.name
}

output "service_arn" {
  description = "ARN of the ECS service"
  value       = aws_ecs_service.main.id
}

# Task Definition outputs
output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.main.arn
}

output "task_definition_family" {
  description = "Family of the task definition"
  value       = aws_ecs_task_definition.main.family
}

output "task_definition_revision" {
  description = "Revision of the task definition"
  value       = aws_ecs_task_definition.main.revision
}

# IAM Role outputs
output "execution_role_arn" {
  description = "ARN of the execution role"
  value       = aws_iam_role.execution.arn
}

output "task_role_arn" {
  description = "ARN of the task role"
  value       = aws_iam_role.task.arn
}

# CloudWatch Log Group outputs
output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = var.enable_logging ? aws_cloudwatch_log_group.main[0].name : null
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = var.enable_logging ? aws_cloudwatch_log_group.main[0].arn : null
}

# Auto Scaling outputs
output "autoscaling_target_resource_id" {
  description = "Resource ID of the auto scaling target"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.main[0].resource_id : null
}

output "autoscaling_target_scalable_dimension" {
  description = "Scalable dimension of the auto scaling target"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.main[0].scalable_dimension : null
}

output "autoscaling_target_service_namespace" {
  description = "Service namespace of the auto scaling target"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.main[0].service_namespace : null
}

# CloudWatch Alarm outputs
output "high_cpu_alarm_arn" {
  description = "ARN of the high CPU alarm"
  value       = var.enable_autoscaling ? aws_cloudwatch_metric_alarm.high_cpu[0].arn : null
}

output "high_memory_alarm_arn" {
  description = "ARN of the high memory alarm"
  value       = var.enable_autoscaling ? aws_cloudwatch_metric_alarm.high_memory[0].arn : null
}
