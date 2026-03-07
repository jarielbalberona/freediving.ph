# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = [aws_subnet.private_1.id, aws_subnet.private_2.id]
}

# Legacy outputs for backward compatibility
output "main_id" {
  description = "ID of the VPC (legacy)"
  value       = aws_vpc.main.id
}

output "subnet1_id" {
  description = "ID of the first public subnet (legacy)"
  value       = aws_subnet.public_1.id
}

output "subnet2_id" {
  description = "ID of the second public subnet (legacy)"
  value       = aws_subnet.public_2.id
}

# Security Group Outputs
output "alb_sg_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb_sg.id
}

output "ecs_api_sg_id" {
  description = "ID of the ECS API security group"
  value       = aws_security_group.ecs_api_sg.id
}

output "ecs_app_sg_id" {
  description = "ID of the ECS App security group"
  value       = aws_security_group.ecs_app_sg.id
}

output "vpc_endpoints_sg_id" {
  description = "ID of the VPC endpoints security group"
  value       = var.enable_vpc_endpoints ? aws_security_group.vpc_endpoints[0].id : null
}

# Load Balancer Outputs
output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.alb.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.alb.zone_id
}

# Legacy ALB outputs for backward compatibility
output "lb_alb_dns_name" {
  description = "DNS name of the ALB (legacy)"
  value       = aws_lb.alb.dns_name
}

output "lb_alb_zone_id" {
  description = "Zone ID of the ALB (legacy)"
  value       = aws_lb.alb.zone_id
}

# Target Group Outputs
output "api_target_group_arn" {
  description = "ARN of the API target group"
  value       = aws_lb_target_group.api_tg.arn
}

output "app_target_group_arn" {
  description = "ARN of the App target group"
  value       = aws_lb_target_group.app_tg.arn
}

# Legacy target group outputs for backward compatibility
output "lb_target_group_api_tg_id" {
  description = "ID of the API target group (legacy)"
  value       = aws_lb_target_group.api_tg.id
}

output "lb_target_group_app_tg_id" {
  description = "ID of the App target group (legacy)"
  value       = aws_lb_target_group.app_tg.id
}

# NAT Gateway Outputs
output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = var.enable_nat ? [aws_nat_gateway.nat_1[0].id, aws_nat_gateway.nat_2[0].id] : []
}

# VPC Endpoints Outputs
output "vpc_endpoint_ids" {
  description = "IDs of the VPC endpoints"
  value       = var.enable_vpc_endpoints ? [
    aws_vpc_endpoint.s3[0].id,
    aws_vpc_endpoint.dynamodb[0].id,
    aws_vpc_endpoint.ecr_api[0].id,
    aws_vpc_endpoint.ecr_dkr[0].id,
    aws_vpc_endpoint.ssm[0].id,
    aws_vpc_endpoint.secretsmanager[0].id,
    aws_vpc_endpoint.logs[0].id
  ] : []
}