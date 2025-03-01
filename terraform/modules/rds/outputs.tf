# Output the Database Endpoint
output "rds_endpoint" {
  value = aws_db_instance.express_db.endpoint
}
