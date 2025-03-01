module "s3" {
  source                     = "../../modules/s3"
  environment                = var.environment
  project                    = var.project
  aws_s3_bucket_tfstate_name = var.aws_s3_bucket_tfstate_name
  aws_s3_bucket_name         = var.aws_s3_bucket_name
}
