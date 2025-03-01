# RDS Security Group
resource "aws_security_group" "rds_sg" {
  vpc_id = var.module_vpc_main_id

  # Allow inbound connections from ECS security group
  ingress {
    from_port       = 5432 # Change to 3306 for MySQL
    to_port         = 5432 # Change to 3306 for MySQL
    protocol        = "tcp"
    security_groups = [var.module_vpc_ecs_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Subnet Group for RDS (Multi-AZ Support)
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "rds-subnet-group"
  subnet_ids = [var.module_vpc_subnet1_id, var.module_vpc_subnet2_id]
}

# RDS Instance
resource "aws_db_instance" "express_db" {
  identifier             = "${var.project}-rds"
  allocated_storage      = 20
  storage_type           = "gp2"
  engine                 = "postgres" # Change to "mysql" if needed
  engine_version         = "14"       # Change based on your requirement
  instance_class         = "db.t3.micro"
  db_name                = var.project
  username               = var.db_user
  password               = var.db_password
  parameter_group_name   = "default.postgres14"
  publicly_accessible    = false
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
}
