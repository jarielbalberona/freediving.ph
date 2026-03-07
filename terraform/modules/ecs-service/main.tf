# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-${var.project}-${var.service_name}-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}-cluster"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

# ECR Repository
resource "aws_ecr_repository" "main" {
  name = "${var.environment}-${var.project}-${var.service_name}"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

# ECR Lifecycle Policy
resource "aws_ecr_lifecycle_policy" "main" {
  repository = aws_ecr_repository.main.name
  
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "main" {
  count = var.enable_logging ? 1 : 0
  
  name              = "/aws/ecs/${var.environment}-${var.project}-${var.service_name}"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}-logs"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "execution" {
  name = "${var.environment}-${var.project}-${var.service_name}-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}-execution-role"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "execution_ecs" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Attach custom execution role policies
resource "aws_iam_role_policy_attachment" "execution_custom" {
  count = length(var.execution_role_policies)
  
  role       = aws_iam_role.execution.name
  policy_arn = var.execution_role_policies[count.index]
}

# IAM Role for ECS Task
resource "aws_iam_role" "task" {
  name = "${var.environment}-${var.project}-${var.service_name}-task-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}-task-role"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

# Attach custom task role policies
resource "aws_iam_role_policy_attachment" "task_custom" {
  count = length(var.task_role_policies)
  
  role       = aws_iam_role.task.name
  policy_arn = var.task_role_policies[count.index]
}

# ECS Task Definition
resource "aws_ecs_task_definition" "main" {
  family                   = "${var.environment}-${var.project}-${var.service_name}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn           = aws_iam_role.task.arn
  
  container_definitions = jsonencode([
    {
      name  = var.service_name
      image = var.image
      
      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]
      
      environment = [
        for name, value in var.environment_variables : {
          name  = name
          value = value
        }
      ]
      
      secrets = [
        for name, arn in var.secrets : {
          name      = name
          valueFrom = arn
        }
      ]
      
      logConfiguration = var.enable_logging ? {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.main[0].name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      } : null
      
      healthCheck = {
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:${var.container_port}${var.health_check_path} || exit 1"
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}-task-def"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

# ECS Service
resource "aws_ecs_service" "main" {
  name            = "${var.environment}-${var.project}-${var.service_name}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.service_name
    container_port   = var.container_port
  }
  
  deployment_circuit_breaker {
    enable   = var.deployment_circuit_breaker
    rollback = var.deployment_rollback
  }
  
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }
  
  health_check_grace_period_seconds = var.health_check_grace_period
  
  depends_on = [aws_iam_role_policy_attachment.execution_ecs]
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

# Auto Scaling Target
resource "aws_appautoscaling_target" "main" {
  count = var.enable_autoscaling ? 1 : 0
  
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}-scaling-target"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

# Auto Scaling Policy - CPU
resource "aws_appautoscaling_policy" "cpu" {
  count = var.enable_autoscaling ? 1 : 0
  
  name               = "${var.environment}-${var.project}-${var.service_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.main[0].resource_id
  scalable_dimension = aws_appautoscaling_target.main[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.main[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.target_cpu_utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}

# Auto Scaling Policy - Memory
resource "aws_appautoscaling_policy" "memory" {
  count = var.enable_autoscaling ? 1 : 0
  
  name               = "${var.environment}-${var.project}-${var.service_name}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.main[0].resource_id
  scalable_dimension = aws_appautoscaling_target.main[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.main[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.target_memory_utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  count = var.enable_autoscaling ? 1 : 0
  
  alarm_name          = "${var.environment}-${var.project}-${var.service_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  
  dimensions = {
    ServiceName = aws_ecs_service.main.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}-high-cpu"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  count = var.enable_autoscaling ? 1 : 0
  
  alarm_name          = "${var.environment}-${var.project}-${var.service_name}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS memory utilization"
  
  dimensions = {
    ServiceName = aws_ecs_service.main.name
    ClusterName = aws_ecs_cluster.main.name
  }
  
  tags = {
    Name        = "${var.environment}-${var.project}-${var.service_name}-high-memory"
    Environment = var.environment
    Project     = var.project
    Service     = var.service_name
  }
}

# Data source for current region
data "aws_region" "current" {}
