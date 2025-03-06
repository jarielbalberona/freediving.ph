module "s3" {
  source                     = "../../modules/s3"
  environment                = var.environment
  project                    = var.project
  aws_s3_bucket_tfstate_name = var.aws_s3_bucket_tfstate_name
  aws_s3_bucket_name         = var.aws_s3_bucket_name
}

module "networking" {
  source                                  = "../../modules/networking"
  environment                             = var.environment
  project                                 = var.project
  aws_project_name                        = var.aws_project_name
  project_app_domain                      = var.project_app_domain
  project_api_domain                      = var.project_api_domain
  module_route53_acm_certificate_ssl_cert = module.route53.acm_certificate_ssl_cert_arn
}

module "ecs" {
  source                                      = "../../modules/ecs"
  environment                                 = var.environment
  project                                     = var.project
  project_api_port                            = var.project_api_port
  project_app_port                            = var.project_app_port
  aws_region                                  = var.aws_region
  aws_project_name                            = var.aws_project_name
  module_networking_main_id                   = module.networking.main_id
  module_networking_subnet1_id                = module.networking.subnet1_id
  module_networking_subnet2_id                = module.networking.subnet2_id
  module_networking_ecs_api_sg_id             = module.networking.ecs_api_sg_id
  module_networking_ecs_app_sg_id             = module.networking.ecs_app_sg_id
  module_networking_lb_target_group_api_tg_id = module.networking.lb_target_group_api_tg_id
  module_networking_lb_target_group_app_tg_id = module.networking.lb_target_group_app_tg_id
  module_rds_aws_security_group               = module.rds.aws_security_group
  module_rds_aws_security_group_id            = module.rds.aws_security_group_id
  module_networking_alb_sg_id                 = module.networking.alb_sg_id
}

module "rds" {
  source                       = "../../modules/rds"
  environment                  = var.environment
  project                      = var.project
  aws_project_name             = var.aws_project_name
  module_ecs_sg_id             = module.ecs.sg_id
  module_networking_main_id    = module.networking.main_id
  module_networking_subnet1_id = module.networking.subnet1_id
  module_networking_subnet2_id = module.networking.subnet2_id
  db_user                      = var.db_user
  db_password                  = var.db_password

}

module "cognito" {
  source                      = "../../modules/cognito"
  environment                 = var.environment
  project                     = var.project
  project_auth_domain_cognito = var.project_auth_domain_cognito
  project_app_url             = var.project_app_url
  project_api_url             = var.project_api_url
  aws_region                  = var.aws_region

}

module "route53" {
  source                            = "../../modules/route53"
  environment                       = var.environment
  project                           = var.project
  project_app_domain                = var.project_app_domain
  project_api_domain                = var.project_api_domain
  module_networking_lb_alb_dsn_name = module.networking.lb_alb_dns_name
  module_networking_lb_alb_zone_id  = module.networking.lb_alb_zone_id
}
