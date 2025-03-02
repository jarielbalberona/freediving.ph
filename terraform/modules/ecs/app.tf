resource "aws_iam_role" "ecs_task_role_nextjs" {
  name = "ecsTaskRoleNextjs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_policy_attachment" "ecs_task_role_nextjs_attach" {
  name       = "ecs-task-nextjs-policy"
  roles      = [aws_iam_role.ecs_task_role_nextjs.name]
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Define the ECS Task Definition for Next.js
resource "aws_ecs_task_definition" "nextjs_task" {
  family                   = "nextjs-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_role_nextjs.arn
  task_role_arn            = aws_iam_role.ecs_task_role_nextjs.arn

  container_definitions = jsonencode([
    {
      name      = "${var.environment}-${var.aws_project_name}-api",
      image     = "${aws_ecr_repository.main.repository_url}:latest",
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
          awslogs-group         = "/ecs/nextjs"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

# Attach Next.js Service to the Existing ECS Cluster
resource "aws_ecs_service" "nextjs_service" {
  name            = "nextjs-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.nextjs_task.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.module_networking_subnet1_id, var.module_networking_subnet2_id]
    security_groups  = [var.module_networking_ecs_nextjs_sg_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.module_networking_lb_target_group_nextjs_tg_id
    container_name   = "nextjs"
    container_port   = 3000
  }

  desired_count = 1
}
