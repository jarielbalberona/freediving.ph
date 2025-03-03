data "aws_route53_zone" "main" {
  name         = var.project
  private_zone = false
}

# resource "aws_route53_record" "nextjs_dns" {
#   zone_id = data.aws_route53_zone.main.zone_id
#   name    = var.project_app_domain
#   type    = "A"

#   alias {
#     name                   = var.module_networking_lb_alb_dsn_name
#     zone_id                = var.module_networking_lb_alb_zone_id
#     evaluate_target_health = true
#   }
# }

resource "aws_route53_record" "express_dns" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.project_api_domain
  type    = "A"

  alias {
    name                   = var.module_networking_lb_alb_dsn_name
    zone_id                = var.module_networking_lb_alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_acm_certificate" "api_ssl_cert" {
  domain_name       = var.project_api_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_ssl_cert.domain_validation_options : dvo.domain_name => {
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

# resource "aws_acm_certificate" "app_ssl_cert" {
#   domain_name = var.project_app_domain
#   subject_alternative_names = [
#     var.project_app_domain,
#   ]
#   validation_method = "DNS"

#   lifecycle {
#     create_before_destroy = true
#   }
# }

# resource "aws_route53_record" "nextjs_cert_validation" {
#   for_each = {
#     for dvo in aws_acm_certificate.app_ssl_cert.domain_validation_options : dvo.domain_name => {
#       name   = dvo.resource_record_name
#       record = dvo.resource_record_value
#       type   = dvo.resource_record_type
#     }
#   }

#   zone_id = data.aws_route53_zone.main.zone_id
#   name    = each.value.name
#   type    = each.value.type
#   records = [each.value.record]
#   ttl     = 60
# }
