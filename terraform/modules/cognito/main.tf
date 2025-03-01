# Cognito User Pool
resource "aws_cognito_user_pool" "nextjs_auth" {
  name = "${var.project}-cognito-user-pool"

  # Allow users to log in with email instead of a username
  username_attributes = ["email"]

  # Allow alias login (username or email)
  alias_attributes = ["email", "preferred_username"]

  auto_verified_attributes = ["email"]

  # Enable Multi-Factor Authentication (Optional)
  mfa_configuration = "OFF" # Change to "OPTIONAL" or "ON" if needed

  schema {
    name                = "sub"
    attribute_data_type = "String"
    required            = true
    mutable             = false
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true # Allow users to update their email
  }

  # Configuration for email verification
  verification_message_template {
    email_subject        = "Verify your email"
    email_message        = "Click the link to verify your email: {##Verify Email##}"
    default_email_option = "CONFIRM_WITH_LINK" # Uses a verification link instead of a code
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  # Allow "username" as a separate attribute
  schema {
    name                = "username"
    attribute_data_type = "String"
    required            = true
    mutable             = false # Allows users to change their username if needed
  }

  # Password Policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  schema {
    name                = "email_verified"
    attribute_data_type = "Boolean"
    required            = false
    mutable             = true
  }

  schema {
    name                = "phone_number"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  schema {
    name                = "custom:user_id"
    attribute_data_type = "String"
    required            = true
    mutable             = false
  }

  schema {
    name                = "custom:role"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }
}

# Cognito User Pool Client (For Next.js App)
resource "aws_cognito_user_pool_client" "nextjs_client" {
  name                                 = "${var.project}-cognito-user-pool-client"
  user_pool_id                         = aws_cognito_user_pool.nextjs_auth.id
  generate_secret                      = false
  allowed_oauth_flows                  = ["code", "implicit"] # OIDC flows
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = ["${var.project_api_url}/auth/callback"] # Update with production URL
  logout_urls                          = [var.project_app_url]
  supported_identity_providers         = ["COGNITO"]
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH", # Enables Cognito authentication with email/password
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# Cognito Domain (For Hosted UI Login)
resource "aws_cognito_user_pool_domain" "nextjs_domain" {
  domain       = var.project_auth_domain
  user_pool_id = aws_cognito_user_pool.nextjs_auth.id
}

