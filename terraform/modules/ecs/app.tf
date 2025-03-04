# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role_app" {
  name = "ecsTaskExecutionRoleApp"

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
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy_app" {
  role       = aws_iam_role.ecs_task_execution_role_app.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Policy for CloudWatch Logs (Needed for ECS Logging)
resource "aws_iam_policy" "ecs_logs_policy_app" {
  name        = "ecsTaskExecutionRoleLogsPolicyApp"
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
resource "aws_iam_role_policy_attachment" "ecs_logs_policy_attach_app" {
  role       = aws_iam_role.ecs_task_execution_role_app.name
  policy_arn = aws_iam_policy.ecs_logs_policy_app.arn
}


# Define the ECS Task Definition for Next.js
resource "aws_ecs_task_definition" "app" {
  family                   = "app-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role_app.arn

  container_definitions = jsonencode([
    {
      name      = "${var.environment}-${var.aws_project_name}-app",
      image     = "${aws_ecr_repository.app.repository_url}:app",
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "ecs/${var.environment}-${var.aws_project_name}-app"
          awslogs-create-group  = "true"
          awslogs-region        = "ap-southeast-1"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

# Attach Next.js Service to the Existing ECS Cluster
resource "aws_ecs_service" "app_service" {
  name            = "app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.module_networking_subnet1_id, var.module_networking_subnet2_id]
    security_groups  = [var.module_networking_ecs_app_sg_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.module_networking_lb_target_group_app_tg_id
    container_name   = "${var.environment}-${var.aws_project_name}-app"
    container_port   = 3000
  }

  desired_count = 1
}


resource "aws_appautoscaling_target" "app_target" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy_app" {
  name               = "${var.environment}-${var.aws_project_name}-app-cpu-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app_target.resource_id
  scalable_dimension = aws_appautoscaling_target.app_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.app_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 80.0 # Scale up if CPU > 80%
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300 # 5-minute cooldown before scaling down
    scale_out_cooldown = 60  # 1-minute cooldown before scaling up
  }
}

