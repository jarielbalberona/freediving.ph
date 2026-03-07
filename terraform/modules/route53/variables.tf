variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "project" {
  description = "Project name"
  type        = string
}

variable "zone_name" {
  description = "Root domain name (e.g., freediving.ph)"
  type        = string
}

variable "subdomains" {
  description = "Map of subdomain configurations"
  type = map(object({
    name = string
    type = string
    alias = optional(object({
      name                   = string
      zone_id                = string
      evaluate_target_health = bool
    }))
  }))
  default = {}
}

variable "module_networking_lb_alb_dsn_name" {
  description = "ALB DNS name"
  type        = string
}

variable "module_networking_lb_alb_zone_id" {
  description = "ALB zone ID"
  type        = string
}

variable "region_for_cf_cert" {
  description = "Region for CloudFront certificate (must be us-east-1)"
  type        = string
  default     = "us-east-1"
}

variable "enable_cloudfront_cert" {
  description = "Enable CloudFront certificate (us-east-1)"
  type        = bool
  default     = false
}
