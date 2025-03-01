output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.nextjs_auth.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.nextjs_client.id
}

output "cognito_domain_url" {
  value = "https://${aws_cognito_user_pool_domain.nextjs_domain.domain}.auth.${var.aws_region}.amazoncognito.com"
}
