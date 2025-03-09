resource "aws_security_group" "ecs_sg" {
  name   = "${var.environment}-${var.aws_project_name}-ecs-sg"
  vpc_id = var.module_networking_main_id

  # Allow traffic from ALB only (assuming ALB is handling external traffic)
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [var.module_networking_alb_sg_id]
  }

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.module_networking_alb_sg_id]
  }

  # 🔹 Allow outbound connections to RDS on port 5432
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.module_rds_aws_security_group_id] # 🔹 RDS SG
  }

  # 🔹 Allow all other outbound traffic (optional but recommended)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # 🔹 Allow internet access (for updates, logs, etc.)
  }
  tags = {
    Name = "${var.environment}-${var.aws_project_name}-ecs-sg"
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

