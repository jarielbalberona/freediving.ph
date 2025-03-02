output "main_id" {
  value = aws_vpc.main.id
}
output "subnet1_id" {
  value = aws_subnet.subnet_1.id
}
output "subnet2_id" {
  value = aws_subnet.subnet_2.id
}

output "ecs_express_sg_id" {
  value = aws_security_group.ecs_express_sg.id
}

output "ecs_nextjs_sg_id" {
  value = aws_security_group.ecs_nextjs_sg.id
}

output "lb_target_group_nextjs_tg_id" {
  value = aws_lb_target_group.nextjs_tg.id
}

output "lb_alb_dns_name" {
  value = aws_lb.alb.dns_name
}

output "lb_alb_zone_id" {
  value = aws_lb.alb.zone_id
}
