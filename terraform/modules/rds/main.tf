# Random password for database (fallback if secrets manager not used)
resource "random_password" "db_password" {
  count   = var.secrets_manager_secret_arn == "" ? 1 : 0
  length  = 32
  special = false
}

# RDS Security Group
resource "aws_security_group" "rds_sg" {
  name        = "${var.environment}-${var.aws_project_name}-rds-sg"
  description = "Security group for RDS PostgreSQL instance"
  vpc_id      = var.module_networking_main_id
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-rds-sg"
    Environment = var.environment
    Project     = var.project
  }
}

# Allow inbound PostgreSQL traffic from ECS API security group
resource "aws_security_group_rule" "rds_ingress_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = var.module_networking_ecs_api_sg_id
  description              = "PostgreSQL access from ECS API"
}

# Allow outbound traffic from RDS (for logging, etc.)
resource "aws_security_group_rule" "rds_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.rds_sg.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "All outbound traffic"
}

# DB Subnet Group
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "${var.environment}-${var.aws_project_name}-rds-subnet-group"
  subnet_ids = [var.module_networking_subnet1_id, var.module_networking_subnet2_id]
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-rds-subnet-group"
    Environment = var.environment
    Project     = var.project
  }
}

# DB Parameter Group
resource "aws_db_parameter_group" "postgres" {
  family = "postgres14"
  name   = "${var.environment}-${var.aws_project_name}-postgres-params"
  
  # Performance tuning parameters
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
  
  parameter {
    name  = "log_statement"
    value = "all"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  
  parameter {
    name  = "log_connections"
    value = "1"
  }
  
  parameter {
    name  = "log_disconnections"
    value = "1"
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-postgres-params"
    Environment = var.environment
    Project     = var.project
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier     = "${var.environment}-${var.aws_project_name}-rds"
  engine         = "postgres"
  engine_version = "14.11"
  instance_class = var.instance_class
  
  # Storage configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Database configuration
  db_name  = var.db_name
  username = var.db_user
  password = var.secrets_manager_secret_arn == "" ? random_password.db_password[0].result : null
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false
  
  # High availability
  multi_az = var.multi_az
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = "18:00-20:00"
  maintenance_window     = "sun:20:00-sun:22:00"
  
  # Security
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment == "dev" ? null : "${var.environment}-${var.aws_project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
  
  # Performance Insights
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_retention_period = 7
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgres.name
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  # IAM database authentication
  iam_database_authentication_enabled = true
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-rds"
    Environment = var.environment
    Project     = var.project
  }
}

# IAM Role for Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.environment}-${var.aws_project_name}-rds-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-rds-monitoring-role"
    Environment = var.environment
    Project     = var.project
  }
}

# Attach AWS managed policy for RDS enhanced monitoring
resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Log Groups for RDS logs
resource "aws_cloudwatch_log_group" "postgresql" {
  name              = "/aws/rds/instance/${aws_db_instance.main.id}/postgresql"
  retention_in_days = var.environment == "prod" ? 30 : 7
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-postgresql-logs"
    Environment = var.environment
    Project     = var.project
  }
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.environment}-${var.aws_project_name}-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-rds-cpu-alarm"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "${var.environment}-${var.aws_project_name}-rds-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS database connections"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-rds-connections-alarm"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_cloudwatch_metric_alarm" "database_free_storage" {
  alarm_name          = "${var.environment}-${var.aws_project_name}-rds-free-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000000000" # 2GB in bytes
  alarm_description   = "This metric monitors RDS free storage space"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-rds-free-storage-alarm"
    Environment = var.environment
    Project     = var.project
  }
}