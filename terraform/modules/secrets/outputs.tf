# Database credentials outputs
output "db_password_arn" {
  description = "ARN of the database password SSM parameter"
  value       = aws_ssm_parameter.db_password.arn
}

output "db_user_arn" {
  description = "ARN of the database user SSM parameter"
  value       = aws_ssm_parameter.db_user.arn
}

output "db_name_arn" {
  description = "ARN of the database name SSM parameter"
  value       = aws_ssm_parameter.db_name.arn
}

output "db_connection_secret_arn" {
  description = "ARN of the database connection Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_connection.arn
}

# JWT secret output
output "jwt_secret_arn" {
  description = "ARN of the JWT secret SSM parameter"
  value       = aws_ssm_parameter.jwt_secret.arn
}

# API keys outputs
output "api_keys_arns" {
  description = "ARNs of the API keys SSM parameters"
  value       = { for k, v in aws_ssm_parameter.api_keys : k => v.arn }
}

# KMS key outputs
output "secrets_kms_key_arn" {
  description = "ARN of the secrets KMS key"
  value       = aws_kms_key.secrets.arn
}

output "secrets_kms_key_id" {
  description = "ID of the secrets KMS key"
  value       = aws_kms_key.secrets.key_id
}

# Database connection details (for reference)
output "db_connection_details" {
  description = "Database connection details (sensitive)"
  value = {
    host     = var.db_host
    port     = var.db_port
    username = var.db_user
    dbname   = var.db_name
  }
  sensitive = true
}
