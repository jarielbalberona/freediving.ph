# RDS Security Group
resource "aws_security_group" "rds_sg" {
  vpc_id = var.module_networking_main_id
  tags = {
    Name = "${var.environment}-${var.aws_project_name}-rds-sg"
  }
}


resource "aws_security_group_rule" "rds_ingress_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = var.module_ecs_sg_id # Allow only ECS traffic
}

resource "aws_security_group_rule" "rds_egress_ecs" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = var.module_ecs_sg_id # Allow only ECS as destination
}

# Subnet Group for RDS (Multi-AZ Support)
resource "aws_db_subnet_group" "rds_subnet_group" {
  subnet_ids = [var.module_networking_subnet1_id, var.module_networking_subnet2_id]
}

# RDS Instance
resource "aws_db_instance" "project_db" {
  identifier             = "${var.environment}-${var.aws_project_name}-rds"
  allocated_storage      = 20
  storage_type           = "gp2"
  engine                 = "postgres" # Change to "mysql" if needed
  engine_version         = "14"       # Change based on your requirement
  instance_class         = "db.t3.micro"
  db_name                = "freedivingph"
  username               = var.db_user
  password               = var.db_password
  parameter_group_name   = "default.postgres14"
  publicly_accessible    = false
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
}
