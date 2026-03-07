# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = false
}

# SSM Parameter for database password
resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.environment}/${var.project}/database/password"
  type  = "SecureString"
  value = random_password.db_password.result
  
  tags = {
    Name        = "${var.environment}-${var.project}-db-password"
    Environment = var.environment
    Project     = var.project
  }
}

# SSM Parameter for database user
resource "aws_ssm_parameter" "db_user" {
  name  = "/${var.environment}/${var.project}/database/username"
  type  = "String"
  value = var.db_user
  
  tags = {
    Name        = "${var.environment}-${var.project}-db-user"
    Environment = var.environment
    Project     = var.project
  }
}

# SSM Parameter for database name
resource "aws_ssm_parameter" "db_name" {
  name  = "/${var.environment}/${var.project}/database/name"
  type  = "String"
  value = var.db_name
  
  tags = {
    Name        = "${var.environment}-${var.project}-db-name"
    Environment = var.environment
    Project     = var.project
  }
}

# Secrets Manager secret for database connection
resource "aws_secretsmanager_secret" "db_connection" {
  name        = "${var.environment}/${var.project}/database/connection"
  description = "Database connection details for ${var.environment} environment"
  
  tags = {
    Name        = "${var.environment}-${var.project}-db-connection"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_secretsmanager_secret_version" "db_connection" {
  secret_id = aws_secretsmanager_secret.db_connection.id
  secret_string = jsonencode({
    username = var.db_user
    password = random_password.db_password.result
    host     = var.db_host
    port     = var.db_port
    dbname   = var.db_name
    url      = "postgresql://${var.db_user}:${random_password.db_password.result}@${var.db_host}:${var.db_port}/${var.db_name}"
  })
}

# SSM Parameter for JWT secret
resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${var.environment}/${var.project}/app/jwt-secret"
  type  = "SecureString"
  value = random_password.jwt_secret.result
  
  tags = {
    Name        = "${var.environment}-${var.project}-jwt-secret"
    Environment = var.environment
    Project     = var.project
  }
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# SSM Parameter for API keys (if needed)
resource "aws_ssm_parameter" "api_keys" {
  for_each = var.api_keys
  
  name  = "/${var.environment}/${var.project}/api/${each.key}"
  type  = "SecureString"
  value = each.value
  
  tags = {
    Name        = "${var.environment}-${var.project}-api-${each.key}"
    Environment = var.environment
    Project     = var.project
  }
}

# KMS Key for secrets encryption
resource "aws_kms_key" "secrets" {
  description             = "KMS key for ${var.environment} environment secrets"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = {
    Name        = "${var.environment}-${var.project}-secrets-key"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.environment}-${var.project}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}
