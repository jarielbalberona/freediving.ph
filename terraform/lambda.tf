# # module "lambda" {
# #   source = "./modules/lambda"
# #   env    = var.env
# # }


# # IAM Role for Lambda
# resource "aws_iam_role" "lambda_role" {
#   name = "${var.project}-lambda-role-media-processing"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17",
#     Statement = [{
#       Action    = "sts:AssumeRole",
#       Effect    = "Allow",
#       Principal = { Service = "lambda.amazonaws.com" }
#     }]
#   })
# }

# # IAM Policy for Lambda to Access S3 & MediaConvert
# resource "aws_iam_policy" "lambda_policy" {
#   name        = "${var.project}-lambda-policy-media"
#   description = "Permissions for Lambda to access S3 and MediaConvert"

#   policy = jsonencode({
#     Version = "2012-10-17",
#     Statement = [
#       {
#         Action   = ["s3:GetObject", "s3:PutObject"],
#         Effect   = "Allow",
#         Resource = "${aws_s3_bucket.media.arn}/*"
#       },
#       {
#         Action   = "mediaconvert:CreateJob",
#         Effect   = "Allow",
#         Resource = "*"
#       },
#       {
#         Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
#         Effect   = "Allow",
#         Resource = "arn:aws:logs:*:*:*"
#       }
#     ]
#   })
# }

# resource "aws_iam_role_policy_attachment" "lambda_attach" {
#   role       = aws_iam_role.lambda_role.name
#   policy_arn = aws_iam_policy.lambda_policy.arn
# }


# # # S3 Event Trigger for Image Processing
# # resource "aws_s3_bucket_notification" "image_trigger" {
# #   bucket = aws_s3_bucket.media.id

# #   lambda_function {
# #     lambda_function_arn = aws_lambda_function.image_thumbnail.arn
# #     events              = ["s3:ObjectCreated:Put"]
# #   }
# # }

# # # S3 Event Trigger for Video Processing
# # resource "aws_s3_bucket_notification" "video_trigger" {
# #   bucket = aws_s3_bucket.media.id

# #   lambda_function {
# #     lambda_function_arn = aws_lambda_function.video_metadata.arn
# #     events              = ["s3:ObjectCreated:Put"]
# #   }
# # }

# # # Lambda Function for Image Thumbnails
# # resource "aws_lambda_function" "image_thumbnail" {
# #   function_name = "image_thumbnail"
# #   runtime       = "nodejs18.x"
# #   role          = aws_iam_role.lambda_role.arn
# #   handler       = "index.handler"
# #   # filename      = "./lambda_image_thumbnail.zip"
# # }

# # # Lambda Function for Video Metadata Extraction
# # resource "aws_lambda_function" "video_metadata" {
# #   function_name = "video_metadata"
# #   runtime       = "nodejs18.x"
# #   role          = aws_iam_role.lambda_role.arn
# #   handler       = "index.handler"
# #   filename      = "./lambda_video_metadata.zip"
# # }
