

# S3 Bucket for Media Storage
resource "aws_s3_bucket" "media_bucket" {
  bucket = "${var.aws_s3_bucket_name}-media"
}

# S3 Bucket Policy to Allow Presigned URL Uploads
resource "aws_s3_bucket_policy" "media_policy" {
  bucket = aws_s3_bucket.media_bucket.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect    = "Allow",
        Principal = "*",
        Action    = "s3:GetObject",
        Resource  = "${aws_s3_bucket.media_bucket.arn}/*",
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.media_bucket.bucket_regional_domain_name
    origin_id   = "S3-freedivingph-media"
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-freedivingph-media"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# CloudFront Origin Access Identity (OAI)
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for Freediving Philippines S3"
}

# Attach OAI Permissions to S3 Bucket
resource "aws_s3_bucket_policy" "oai_policy" {
  bucket = aws_s3_bucket.media_bucket.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          AWS = "${aws_cloudfront_origin_access_identity.oai.iam_arn}"
        },
        Action   = "s3:GetObject",
        Resource = "${aws_s3_bucket.media_bucket.arn}/*"
      }
    ]
  })
}
