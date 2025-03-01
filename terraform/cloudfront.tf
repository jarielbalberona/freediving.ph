# # CloudFront Distribution
# resource "aws_cloudfront_distribution" "cdn" {
#   origin {
#     domain_name = aws_s3_bucket.media.bucket_regional_domain_name
#     origin_id   = "S3-${aws_s3_bucket.media.id}"
#   }

#   enabled             = true
#   default_root_object = "index.html"

#   default_cache_behavior {
#     allowed_methods  = ["GET", "HEAD"]
#     cached_methods   = ["GET", "HEAD"]
#     target_origin_id = "S3-${aws_s3_bucket.media.id}"

#     viewer_protocol_policy = "redirect-to-https"
#     min_ttl                = 0
#     default_ttl            = 86400
#     max_ttl                = 31536000

#     forwarded_values {
#       query_string = false
#       cookies {
#         forward = "none"
#       }
#     }
#   }

#   restrictions {
#     geo_restriction {
#       restriction_type = "none" # No geo-restrictions applied
#     }
#   }

#   viewer_certificate {
#     cloudfront_default_certificate = true
#   }
# }
