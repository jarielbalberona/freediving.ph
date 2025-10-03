# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role_api" {
  name = "ecsTaskExecutionRoleAPI"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# Attach AWS Managed Policy for ECS Task Execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy_api" {
  role       = aws_iam_role.ecs_task_execution_role_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Policy for CloudWatch Logs (Needed for ECS Logging)
resource "aws_iam_policy" "ecs_logs_policy_api" {
  name        = "ecsTaskExecutionRoleLogsPolicyAPI"
  description = "Allows ECS tasks to create and write logs to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:ap-southeast-1:486564619398:log-group:*"
      }
    ]
  })
}

# Attach CloudWatch Logs Policy to ECS Task Execution Role
resource "aws_iam_role_policy_attachment" "ecs_logs_policy_attach_api" {
  role       = aws_iam_role.ecs_task_execution_role_api.name
  policy_arn = aws_iam_policy.ecs_logs_policy_api.arn
}


# ECS Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "api-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role_api.arn
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name  = "${var.environment}-${var.aws_project_name}-api"
      image = "${aws_ecr_repository.api.repository_url}:latest"
      portMappings = [{
        containerPort = 4000
        hostPort      = 4000
      }]
      environment = [
        { name = "DATABASE_URL", value = "postgresql://${var.module_rds_db_user}:${var.module_rds_db_password}@${var.module_rds_endpoint}/${var.module_rds_db_name}" },
        { name = "PORT", value = "4000" },
        { name = "NODE_ENV", value = "development" },
        { name = "SECRET", value = "secretcsrffreediving-ph" },
        { name = "JWT_COOKIE_NAME", value = "jwtauthfreediving-ph" },
        { name = "SESSION_COOKIE_NAME", value = "sessauthfreediving-ph" },
        { name = "ORIGIN_URL", value = "https://app.dev.freediving.ph" },
        { name = "APP_URL", value = "https://app.dev.freediving.ph" },
        { name = "API_URL", value = "https://api.dev.freediving.ph" },
        { name = "RESEND_EMAIL_KEY", value = "re_MWcm3XnE_MPLJ8MbwpGZiAoXjmefHNu1X" },
        { name = "RESEND_EMAIL_FROM", value = "admin@freediving.ph" },
        { name = "NEXT_PUBLIC_API_URL", value = "https://api.dev.freediving.ph" },
        { name = "NEXT_PUBLIC_APP_URL", value = "https://app.dev.freediving.ph" },
        { name = "NEXT_TELEMETRY_DISABLED", value = "1" },
        { name = "NEXT_RUNTIME", value = "nodejs" },
        { name = "NEXT_SHARP_PATH", value = "/tmp/node_modules/sharp" },
        { name = "NEXT_PUBLIC_SECURITY_HEADERS", value = "true" },
        { name = "NEXT_PUBLIC_CACHE_CONTROL", value = "public, max-age=31536000, immutable" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "ecs/${var.environment}-${var.aws_project_name}-api"
          awslogs-create-group  = "true"
          awslogs-region        = "ap-southeast-1"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = [var.module_networking_subnet1_id, var.module_networking_subnet2_id]
    security_groups  = [var.module_networking_ecs_api_sg_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.module_networking_lb_target_group_api_tg_id
    container_name   = "${var.environment}-${var.aws_project_name}-api"
    container_port   = var.project_api_port
  }
}

resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy_api" {
  name               = "${var.environment}-${var.aws_project_name}-api-cpu-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 80.0 # Scale up if CPU > 80%
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300 # 5-minute cooldown before scaling down
    scale_out_cooldown = 60  # 1-minute cooldown before scaling up
  }
}
