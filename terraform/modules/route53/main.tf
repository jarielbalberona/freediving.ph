# Data source for the hosted zone
data "aws_route53_zone" "main" {
  name         = var.zone_name
  private_zone = false
}

# Create DNS records for each subdomain
resource "aws_route53_record" "subdomains" {
  for_each = var.subdomains
  
  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  
  dynamic "alias" {
    for_each = each.value.alias != null ? [each.value.alias] : []
    content {
      name                   = alias.value.name
      zone_id                = alias.value.zone_id
      evaluate_target_health = alias.value.evaluate_target_health
    }
  }
  
  dynamic "records" {
    for_each = each.value.alias == null ? [1] : []
    content {
      # This would be used for non-alias records
      # For now, we're focusing on ALB aliases
    }
  }
  
  tags = {
    Name        = "${var.environment}-${var.project}-${each.key}"
    Environment = var.environment
    Project     = var.project
  }
}

# ACM Certificate for ALB (same region as ALB)
resource "aws_acm_certificate" "alb_cert" {
  domain_name = var.zone_name
  subject_alternative_names = [
    for subdomain in var.subdomains : "${subdomain.value.name}.${var.zone_name}"
  ]
  validation_method = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = {
    Name        = "${var.environment}-${var.project}-alb-cert"
    Environment = var.environment
    Project     = var.project
  }
}

# DNS validation records for ALB certificate
resource "aws_route53_record" "alb_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.alb_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
  
  tags = {
    Name        = "${var.environment}-${var.project}-alb-cert-validation"
    Environment = var.environment
    Project     = var.project
  }
}

# Certificate validation
resource "aws_acm_certificate_validation" "alb_cert" {
  certificate_arn         = aws_acm_certificate.alb_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.alb_cert_validation : record.fqdn]
  
  timeouts {
    create = "5m"
  }
}

# CloudFront Certificate (us-east-1) - optional
resource "aws_acm_certificate" "cloudfront_cert" {
  count = var.enable_cloudfront_cert ? 1 : 0
  
  provider = aws.us_east_1
  
  domain_name = var.zone_name
  subject_alternative_names = [
    for subdomain in var.subdomains : "${subdomain.value.name}.${var.zone_name}"
  ]
  validation_method = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = {
    Name        = "${var.environment}-${var.project}-cloudfront-cert"
    Environment = var.environment
    Project     = var.project
  }
}

# DNS validation records for CloudFront certificate
resource "aws_route53_record" "cloudfront_cert_validation" {
  count = var.enable_cloudfront_cert ? 1 : 0
  
  for_each = {
    for dvo in aws_acm_certificate.cloudfront_cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
  
  tags = {
    Name        = "${var.environment}-${var.project}-cloudfront-cert-validation"
    Environment = var.environment
    Project     = var.project
  }
}

# CloudFront certificate validation
resource "aws_acm_certificate_validation" "cloudfront_cert" {
  count = var.enable_cloudfront_cert ? 1 : 0
  
  provider = aws.us_east_1
  
  certificate_arn         = aws_acm_certificate.cloudfront_cert[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_cert_validation[0] : record.fqdn]
  
  timeouts {
    create = "5m"
  }
}