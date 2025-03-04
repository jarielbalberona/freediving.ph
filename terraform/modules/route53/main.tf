data "aws_route53_zone" "main" {
  name         = var.project
  private_zone = false
}

## API
resource "aws_route53_record" "api_dns" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.project_api_domain
  type    = "A"

  alias {
    name                   = var.module_networking_lb_alb_dsn_name
    zone_id                = var.module_networking_lb_alb_zone_id
    evaluate_target_health = true
  }
}


## APP
resource "aws_route53_record" "app_dns" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.project_app_domain
  type    = "A"

  alias {
    name                   = var.module_networking_lb_alb_dsn_name
    zone_id                = var.module_networking_lb_alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_acm_certificate" "ssl_cert" {
  domain_name = data.aws_route53_zone.main.name
  subject_alternative_names = [
    aws_route53_record.app_dns.name,
    aws_route53_record.api_dns.name,
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.ssl_cert.domain_validation_options : dvo.domain_name => {
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
}
