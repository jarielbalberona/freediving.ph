# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-vpc"
    Environment = var.environment
    Project     = var.project
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-igw"
    Environment = var.environment
    Project     = var.project
  }
}

# Public Subnets
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = var.azs[0]
  map_public_ip_on_launch = true
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-public-1"
    Environment = var.environment
    Project     = var.project
    Type        = "public"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = var.azs[1]
  map_public_ip_on_launch = true
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-public-2"
    Environment = var.environment
    Project     = var.project
    Type        = "public"
  }
}

# Private Subnets
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = var.azs[0]
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-private-1"
    Environment = var.environment
    Project     = var.project
    Type        = "private"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = var.azs[1]
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-private-2"
    Environment = var.environment
    Project     = var.project
    Type        = "private"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-public-rt"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_route_table" "private_1" {
  vpc_id = aws_vpc.main.id
  
  # Route to NAT Gateway if enabled
  dynamic "route" {
    for_each = var.enable_nat ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.nat_1[0].id
    }
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-private-rt-1"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_route_table" "private_2" {
  vpc_id = aws_vpc.main.id
  
  # Route to NAT Gateway if enabled
  dynamic "route" {
    for_each = var.enable_nat ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.nat_2[0].id
    }
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-private-rt-2"
    Environment = var.environment
    Project     = var.project
  }
}

# Route Table Associations
resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private_1.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private_2.id
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat_1" {
  count  = var.enable_nat ? 1 : 0
  domain = "vpc"
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-nat-eip-1"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_eip" "nat_2" {
  count  = var.enable_nat ? 1 : 0
  domain = "vpc"
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-nat-eip-2"
    Environment = var.environment
    Project     = var.project
  }
}

# NAT Gateways
resource "aws_nat_gateway" "nat_1" {
  count         = var.enable_nat ? 1 : 0
  allocation_id = aws_eip.nat_1[0].id
  subnet_id     = aws_subnet.public_1.id
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-nat-1"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_nat_gateway" "nat_2" {
  count         = var.enable_nat ? 1 : 0
  allocation_id = aws_eip.nat_2[0].id
  subnet_id     = aws_subnet.public_2.id
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-nat-2"
    Environment = var.environment
    Project     = var.project
  }
}

# VPC Endpoints (to reduce NAT costs)
resource "aws_vpc_endpoint" "s3" {
  count           = var.enable_vpc_endpoints ? 1 : 0
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [aws_route_table.private_1.id, aws_route_table.private_2.id]
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-s3-endpoint"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_vpc_endpoint" "dynamodb" {
  count           = var.enable_vpc_endpoints ? 1 : 0
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.${data.aws_region.current.name}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [aws_route_table.private_1.id, aws_route_table.private_2.id]
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-dynamodb-endpoint"
    Environment = var.environment
    Project     = var.project
  }
}

# Security Group for VPC Endpoints
resource "aws_security_group" "vpc_endpoints" {
  count       = var.enable_vpc_endpoints ? 1 : 0
  name        = "${var.environment}-${var.aws_project_name}-vpc-endpoints-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-vpc-endpoints-sg"
    Environment = var.environment
    Project     = var.project
  }
}

# Interface VPC Endpoints
resource "aws_vpc_endpoint" "ecr_api" {
  count               = var.enable_vpc_endpoints ? 1 : 0
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-ecr-api-endpoint"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  count               = var.enable_vpc_endpoints ? 1 : 0
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-ecr-dkr-endpoint"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_vpc_endpoint" "ssm" {
  count               = var.enable_vpc_endpoints ? 1 : 0
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-ssm-endpoint"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_vpc_endpoint" "secretsmanager" {
  count               = var.enable_vpc_endpoints ? 1 : 0
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-secretsmanager-endpoint"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_vpc_endpoint" "logs" {
  count               = var.enable_vpc_endpoints ? 1 : 0
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]
  private_dns_enabled = true
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-logs-endpoint"
    Environment = var.environment
    Project     = var.project
  }
}

# Data source for current region
data "aws_region" "current" {}

# ALB Security Group
resource "aws_security_group" "alb_sg" {
  name        = "${var.environment}-${var.aws_project_name}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id
  
  # Allow HTTP traffic from the internet
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from internet"
  }
  
  # Allow HTTPS traffic from the internet
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }
  
  # Allow outbound traffic to ECS tasks
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-alb-sg"
    Environment = var.environment
    Project     = var.project
  }
}

# ECS API Security Group
resource "aws_security_group" "ecs_api_sg" {
  name        = "${var.environment}-${var.aws_project_name}-ecs-api-sg"
  description = "Security group for ECS API tasks"
  vpc_id      = aws_vpc.main.id
  
  # Allow traffic from ALB only
  ingress {
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
    description     = "API traffic from ALB"
  }
  
  # Allow API to access RDS
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.module_rds_aws_security_group_id]
    description     = "Database access"
  }
  
  # Allow API to access VPC endpoints
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "VPC endpoints access"
  }
  
  # Allow API to access external resources (if NAT enabled)
  dynamic "egress" {
    for_each = var.enable_nat ? [1] : []
    content {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      description = "External access via NAT"
    }
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-ecs-api-sg"
    Environment = var.environment
    Project     = var.project
  }
}

# ECS App Security Group
resource "aws_security_group" "ecs_app_sg" {
  name        = "${var.environment}-${var.aws_project_name}-ecs-app-sg"
  description = "Security group for ECS App tasks"
  vpc_id      = aws_vpc.main.id
  
  # Allow traffic from ALB only
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
    description     = "App traffic from ALB"
  }
  
  # Allow App to access external resources (if NAT enabled)
  dynamic "egress" {
    for_each = var.enable_nat ? [1] : []
    content {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      description = "External access via NAT"
    }
  }
  
  # Allow App to access VPC endpoints
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "VPC endpoints access"
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-ecs-app-sg"
    Environment = var.environment
    Project     = var.project
  }
}

# Application Load Balancer
resource "aws_lb" "alb" {
  name               = "${var.environment}-${var.aws_project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]
  idle_timeout       = 30
  
  enable_deletion_protection = var.environment == "prod" ? true : false
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-alb"
    Environment = var.environment
    Project     = var.project
  }
}

# HTTP Listener (redirects to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-alb-listener-http"
    Environment = var.environment
    Project     = var.project
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.module_route53_acm_certificate_ssl_cert
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_tg.arn
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-alb-listener-https"
    Environment = var.environment
    Project     = var.project
  }
}

# API Target Group
resource "aws_lb_target_group" "api_tg" {
  name        = "${var.environment}-${var.aws_project_name}-api-tg"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-api-tg"
    Environment = var.environment
    Project     = var.project
  }
}

# App Target Group
resource "aws_lb_target_group" "app_tg" {
  name        = "${var.environment}-${var.aws_project_name}-app-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-app-tg"
    Environment = var.environment
    Project     = var.project
  }
}

# API Listener Rule
resource "aws_lb_listener_rule" "api_rule" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_tg.arn
  }
  
  condition {
    host_header {
      values = [var.project_api_domain]
    }
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-api-rule"
    Environment = var.environment
    Project     = var.project
  }
}

# App Listener Rule
resource "aws_lb_listener_rule" "app_rule" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg.arn
  }
  
  condition {
    host_header {
      values = [var.project_app_domain]
    }
  }
  
  tags = {
    Name        = "${var.environment}-${var.aws_project_name}-app-rule"
    Environment = var.environment
    Project     = var.project
  }
}