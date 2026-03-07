# Database instance outputs
output "db_instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_address" {
  description = "RDS instance hostname"
  value       = aws_db_instance.main.address
}

output "db_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "db_instance_name" {
  description = "RDS instance database name"
  value       = aws_db_instance.main.db_name
}

output "db_instance_username" {
  description = "RDS instance root username"
  value       = aws_db_instance.main.username
}

# Legacy outputs for backward compatibility
output "endpoint" {
  description = "RDS instance endpoint (legacy)"
  value       = aws_db_instance.main.endpoint
}

# Security group outputs
output "aws_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds_sg.id
}

output "aws_security_group" {
  description = "RDS security group (legacy)"
  value       = aws_security_group.rds_sg
}

# Subnet group outputs
output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.rds_subnet_group.name
}

# Parameter group outputs
output "db_parameter_group_name" {
  description = "Name of the DB parameter group"
  value       = aws_db_parameter_group.postgres.name
}

# Monitoring outputs
output "monitoring_role_arn" {
  description = "ARN of the RDS enhanced monitoring role"
  value       = aws_iam_role.rds_enhanced_monitoring.arn
}

# CloudWatch log group outputs
output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.postgresql.name
}

# CloudWatch alarm outputs
output "cpu_alarm_arn" {
  description = "ARN of the CPU utilization alarm"
  value       = aws_cloudwatch_metric_alarm.database_cpu.arn
}

output "connections_alarm_arn" {
  description = "ARN of the database connections alarm"
  value       = aws_cloudwatch_metric_alarm.database_connections.arn
}

output "free_storage_alarm_arn" {
  description = "ARN of the free storage space alarm"
  value       = aws_cloudwatch_metric_alarm.database_free_storage.arn
}