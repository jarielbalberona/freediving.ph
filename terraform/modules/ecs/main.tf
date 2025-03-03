
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


# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-${var.aws_project_name}-cluster"
}

# ECR Repository for app
resource "aws_ecr_repository" "app" {
  name = "${var.environment}-${var.aws_project_name}-app"
}
# ECR Repository for api
resource "aws_ecr_repository" "api" {
  name = "${var.environment}-${var.aws_project_name}-api"
}

