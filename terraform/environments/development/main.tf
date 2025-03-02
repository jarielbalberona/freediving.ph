module "s3" {
  source                     = "../../modules/s3"
  environment                = var.environment
  project                    = var.project
  aws_s3_bucket_tfstate_name = var.aws_s3_bucket_tfstate_name
  aws_s3_bucket_name         = var.aws_s3_bucket_name
}

module "vpc" {
  source      = "../../modules/vpc"
  environment = var.environment
  project     = var.project
}

module "ecs" {
  source                  = "../../modules/ecs"
  environment             = var.environment
  project                 = var.project
  aws_ecr_repository_name = var.aws_ecr_repository_name
  module_vpc_main_id      = module.vpc.main_id
  module_vpc_ecs_sg_id    = module.vpc.ecs_sg_id
  module_vpc_subnet1_id   = module.vpc.subnet1_id
  module_vpc_subnet2_id   = module.vpc.subnet2_id
}

module "rds" {
  source                = "../../modules/rds"
  environment           = var.environment
  project               = var.project
  module_vpc_main_id    = module.vpc.main_id
  module_vpc_ecs_sg_id  = module.vpc.ecs_sg_id
  module_vpc_subnet1_id = module.vpc.subnet1_id
  module_vpc_subnet2_id = module.vpc.subnet2_id
  db_user               = var.db_user
  db_password           = var.db_password
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
