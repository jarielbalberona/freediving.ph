output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.app_auth.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.app_client.id
}

output "cognito_domain_url" {
  value = "https://${aws_cognito_user_pool_domain.app_domain.domain}.auth.${var.aws_region}.amazoncognito.com"
}
