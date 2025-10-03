# Secrets Management
module "secrets" {
  source = "../../modules/secrets"
  
  environment = var.environment
  project     = var.project
  db_user     = var.db_user
  db_name     = var.db_name
  db_host     = module.rds.db_instance_address
  db_port     = module.rds.db_instance_port
  api_keys    = var.api_keys
}

# Networking
module "networking" {
  source = "../../modules/networking"
  
  environment                             = var.environment
  project                                 = var.project
  aws_project_name                        = var.aws_project_name
  project_app_domain                      = var.project_app_domain
  project_api_domain                      = var.project_api_domain
  module_route53_acm_certificate_ssl_cert = module.route53.alb_certificate_ssl_cert_arn
  module_rds_aws_security_group_id       = module.rds.aws_security_group_id
  vpc_cidr                                = var.vpc_cidr
  azs                                     = var.azs
  enable_nat                              = var.enable_nat
  enable_vpc_endpoints                    = var.enable_vpc_endpoints
}

# RDS Database
module "rds" {
  source = "../../modules/rds"
  
  environment                        = var.environment
  project                           = var.project
  aws_project_name                  = var.aws_project_name
  db_user                          = var.db_user
  db_name                          = var.db_name
  module_ecs_sg_id                 = module.ecs_api.sg_id
  module_networking_main_id        = module.networking.vpc_id
  module_networking_subnet1_id     = module.networking.private_subnet_ids[0]
  module_networking_subnet2_id     = module.networking.private_subnet_ids[1]
  module_networking_ecs_api_sg_id  = module.networking.ecs_api_sg_id
  secrets_manager_secret_arn       = module.secrets.db_connection_secret_arn
  instance_class                   = var.rds_instance_class
  allocated_storage                = var.rds_allocated_storage
  max_allocated_storage            = var.rds_max_allocated_storage
  backup_retention_period          = var.rds_backup_retention_period
  multi_az                         = var.rds_multi_az
  deletion_protection              = var.rds_deletion_protection
  performance_insights_enabled     = var.rds_performance_insights_enabled
  monitoring_interval              = var.rds_monitoring_interval
}

# ECS API Service
module "ecs_api" {
  source = "../../modules/ecs-service"
  
  environment              = var.environment
  project                  = var.project
  service_name             = "api"
  image                   = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.environment}-${var.project}-api:latest"
  cpu                     = var.api_cpu
  memory                  = var.api_memory
  desired_count           = var.api_desired_count
  container_port          = var.project_api_port
  alb_listener_arn        = module.networking.alb_listener_https_arn
  target_group_arn        = module.networking.api_target_group_arn
  private_subnet_ids      = module.networking.private_subnet_ids
  security_group_ids      = [module.networking.ecs_api_sg_id]
  task_role_policies      = var.api_task_role_policies
  execution_role_policies = var.api_execution_role_policies
  secrets = {
    DATABASE_URL = module.secrets.db_connection_secret_arn
    JWT_SECRET   = module.secrets.jwt_secret_arn
  }
  environment_variables = {
    NODE_ENV = var.environment
    PORT     = tostring(var.project_api_port)
  }
  health_check_path                = "/health"
  health_check_grace_period        = var.api_health_check_grace_period
  deployment_circuit_breaker       = var.api_deployment_circuit_breaker
  deployment_rollback              = var.api_deployment_rollback
  enable_autoscaling              = var.api_enable_autoscaling
  min_capacity                    = var.api_min_capacity
  max_capacity                    = var.api_max_capacity
  target_cpu_utilization          = var.api_target_cpu_utilization
  target_memory_utilization       = var.api_target_memory_utilization
  log_retention_days              = var.api_log_retention_days
  enable_logging                  = var.api_enable_logging
}

# ECS App Service
module "ecs_app" {
  source = "../../modules/ecs-service"
  
  environment              = var.environment
  project                  = var.project
  service_name             = "app"
  image                   = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.environment}-${var.project}-app:latest"
  cpu                     = var.app_cpu
  memory                  = var.app_memory
  desired_count           = var.app_desired_count
  container_port          = var.project_app_port
  alb_listener_arn        = module.networking.alb_listener_https_arn
  target_group_arn        = module.networking.app_target_group_arn
  private_subnet_ids      = module.networking.private_subnet_ids
  security_group_ids      = [module.networking.ecs_app_sg_id]
  task_role_policies      = var.app_task_role_policies
  execution_role_policies = var.app_execution_role_policies
  secrets = {
    JWT_SECRET = module.secrets.jwt_secret_arn
  }
  environment_variables = {
    NODE_ENV = var.environment
    PORT     = tostring(var.project_app_port)
    NEXT_PUBLIC_API_URL = var.project_api_url
  }
  health_check_path                = "/api/health"
  health_check_grace_period        = var.app_health_check_grace_period
  deployment_circuit_breaker       = var.app_deployment_circuit_breaker
  deployment_rollback              = var.app_deployment_rollback
  enable_autoscaling              = var.app_enable_autoscaling
  min_capacity                    = var.app_min_capacity
  max_capacity                    = var.app_max_capacity
  target_cpu_utilization          = var.app_target_cpu_utilization
  target_memory_utilization       = var.app_target_memory_utilization
  log_retention_days              = var.app_log_retention_days
  enable_logging                  = var.app_enable_logging
}

# Route53 DNS and SSL Certificates
module "route53" {
  source = "../../modules/route53"
  
  environment                       = var.environment
  project                           = var.project
  zone_name                         = var.zone_name
  subdomains = {
    app = {
      name = var.project_app_domain
      type = "A"
      alias = {
        name                   = module.networking.alb_dns_name
        zone_id                = module.networking.alb_zone_id
        evaluate_target_health = true
      }
    }
    api = {
      name = var.project_api_domain
      type = "A"
      alias = {
        name                   = module.networking.alb_dns_name
        zone_id                = module.networking.alb_zone_id
        evaluate_target_health = true
      }
    }
  }
  module_networking_lb_alb_dsn_name = module.networking.alb_dns_name
  module_networking_lb_alb_zone_id  = module.networking.alb_zone_id
  enable_cloudfront_cert            = var.enable_cloudfront_cert
}
