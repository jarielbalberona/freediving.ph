# Hosted zone outputs
output "hosted_zone_id" {
  description = "ID of the Route53 hosted zone"
  value       = data.aws_route53_zone.main.zone_id
}

output "hosted_zone_name" {
  description = "Name of the Route53 hosted zone"
  value       = data.aws_route53_zone.main.name
}

# DNS record outputs
output "dns_records" {
  description = "Map of DNS records created"
  value = {
    for k, v in aws_route53_record.subdomains : k => {
      name    = v.name
      type    = v.type
      fqdn    = v.fqdn
      records = v.records
    }
  }
}

# Certificate outputs
output "alb_certificate_arn" {
  description = "ARN of the ALB certificate"
  value       = aws_acm_certificate.alb_cert.arn
}

output "alb_certificate_ssl_cert_arn" {
  description = "ARN of the validated ALB certificate (legacy)"
  value       = aws_acm_certificate_validation.alb_cert.certificate_arn
}

output "cloudfront_certificate_arn" {
  description = "ARN of the CloudFront certificate (us-east-1)"
  value       = var.enable_cloudfront_cert ? aws_acm_certificate_validation.cloudfront_cert[0].certificate_arn : null
}

# Legacy outputs for backward compatibility
output "acm_certificate_ssl_cert_arn" {
  description = "ARN of the SSL certificate (legacy)"
  value       = aws_acm_certificate_validation.alb_cert.certificate_arn
}