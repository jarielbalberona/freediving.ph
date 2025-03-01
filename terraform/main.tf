# S3 Bucket
resource "aws_s3_bucket" "media" {
  bucket = var.aws_s3_bucket_name
}

# Disable Block Public Access (to allow public policies)
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 Bucket Policy for Public Read Access (CloudFront)
resource "aws_s3_bucket_policy" "media" {
  bucket     = aws_s3_bucket.media.id
  depends_on = [aws_s3_bucket_public_access_block.media] # Ensure public access block is disabled first

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = "*",
      Action    = "s3:GetObject",
      Resource  = "${aws_s3_bucket.media.arn}/*"
    }]
  })
}


# CloudFront Distribution
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.media.id}"
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.media.id}"

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none" # No geo-restrictions applied
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}


# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project}-lambda-role-media-processing"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# IAM Policy for Lambda to Access S3 & MediaConvert
resource "aws_iam_policy" "lambda_policy" {
  name        = "${var.project}-lambda-policy-media"
  description = "Permissions for Lambda to access S3 and MediaConvert"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action   = ["s3:GetObject", "s3:PutObject"],
        Effect   = "Allow",
        Resource = "${aws_s3_bucket.media.arn}/*"
      },
      {
        Action   = "mediaconvert:CreateJob",
        Effect   = "Allow",
        Resource = "*"
      },
      {
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        Effect   = "Allow",
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}


# # S3 Event Trigger for Image Processing
# resource "aws_s3_bucket_notification" "image_trigger" {
#   bucket = aws_s3_bucket.media.id

#   lambda_function {
#     lambda_function_arn = aws_lambda_function.image_thumbnail.arn
#     events              = ["s3:ObjectCreated:Put"]
#   }
# }

# # S3 Event Trigger for Video Processing
# resource "aws_s3_bucket_notification" "video_trigger" {
#   bucket = aws_s3_bucket.media.id

#   lambda_function {
#     lambda_function_arn = aws_lambda_function.video_metadata.arn
#     events              = ["s3:ObjectCreated:Put"]
#   }
# }

# # Lambda Function for Image Thumbnails
# resource "aws_lambda_function" "image_thumbnail" {
#   function_name = "image_thumbnail"
#   runtime       = "nodejs18.x"
#   role          = aws_iam_role.lambda_role.arn
#   handler       = "index.handler"
#   # filename      = "./lambda_image_thumbnail.zip"
# }

# # Lambda Function for Video Metadata Extraction
# resource "aws_lambda_function" "video_metadata" {
#   function_name = "video_metadata"
#   runtime       = "nodejs18.x"
#   role          = aws_iam_role.lambda_role.arn
#   handler       = "index.handler"
#   filename      = "./lambda_video_metadata.zip"
# }
