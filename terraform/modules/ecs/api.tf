# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"

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
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Policy for CloudWatch Logs (Needed for ECS Logging)
resource "aws_iam_policy" "ecs_logs_policy" {
  name        = "ecsTaskExecutionRoleLogsPolicy"
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
resource "aws_iam_role_policy_attachment" "ecs_logs_policy_attach" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.ecs_logs_policy.arn
}


# ECS Task Definition
resource "aws_ecs_task_definition" "express" {
  family                   = "express-api-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name  = "${var.environment}-${var.aws_project_name}-api",
      image = "${aws_ecr_repository.api.repository_url}:latest",
      portMappings = [{
        containerPort = 4000,
        hostPort      = 4000
      }]
      environment = [
        { name = "DATABASE_URL", value = "postgres://fphbuddies:bPZ6SdIth7@dev-freediving-ph-rds.cji8vqdamzfa.ap-southeast-1.rds.amazonaws.com" },
        { name = "PORT", value = 4000 },
        { name = "NODE_ENV", value = "dev" },
        { name = "SECRET", value = "secretcsrffdph" },
        { name = "JWT_COOKIE_NAME", value = "jwtauthfdph" },
        { name = "SESSION_COOKIE_NAME", value = "sessauthfdph" },
        { name = "ORIGIN_URL", value = "dev.freediving.ph/" },
        { name = "APP_URL", value = "dev.freediving.ph/" },
        { name = "API_URL", value = "api-dev.freediving.ph/" },
        { name = "GOOGLE_CLIENT_ID", value = "test" },
        { name = "GOOGLE_CLIENT_SECRET", value = "test" },
        { name = "GOOGLE_CALLBACK_URL", value = "test" },
        { name = "EMAIL_SERVER_HOST", value = "test" },
        { name = "EMAIL_SERVER_USER", value = "test" },
        { name = "EMAIL_SERVER_PASSWORD", value = "test" },
        { name = "EMAIL_SERVER_PORT", value = "test" },
        { name = "EMAIL_FROM", value = "test" },
        { name = "AWS_REGION", value = "southeast-1" },
        { name = "AWS_ACCESS_KEY", value = "AKIAXCSMC4SDJIG7P55L" },
        { name = "AWS_SECRET_KEY", value = "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" },
        { name = "AWS_S3_FPH_BUCKET_NAME", value = "dev.freediving.ph-media" }

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
resource "aws_ecs_service" "express" {
  name            = "express-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.express.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = [var.module_networking_subnet1_id, var.module_networking_subnet2_id]
    security_groups  = [var.module_networking_ecs_express_sg_id]
    assign_public_ip = true
  }
}

resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.express.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy" {
  name               = "scale-down"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Maximum"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}
