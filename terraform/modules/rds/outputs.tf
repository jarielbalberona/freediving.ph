# Output the Database Endpoint
output "endpoint" {
  value = aws_db_instance.project_db.endpoint
}

output "aws_security_group_id" {
  value = aws_security_group.rds_sg.id
}

output "aws_security_group" {
  value = aws_security_group.rds_sg
}
