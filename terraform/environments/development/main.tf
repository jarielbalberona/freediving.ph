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
