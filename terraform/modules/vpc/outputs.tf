output "ecs_sg_id" {
  value = aws_security_group.ecs_sg.id
}

output "main_id" {
  value = aws_vpc.main.id
}
output "subnet1_id" {
  value = aws_subnet.subnet_1.id
}
output "subnet2_id" {
  value = aws_subnet.subnet_2.id
}
