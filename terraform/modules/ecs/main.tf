
# Security Group for ALB
resource "aws_security_group" "ecs_sg" {
  vpc_id = var.module_networking_main_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ALB (Application Load Balancer)
resource "aws_lb" "ecs_lb" {
  name               = "ecs-load-balancer"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.ecs_sg.id]
  subnets            = [var.module_networking_subnet1_id, var.module_networking_subnet2_id]
}


# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-${var.aws_project_name}-cluster"
}

# ECR Repository
resource "aws_ecr_repository" "main" {
  name = "${var.environment}-${var.aws_project_name}"
}
