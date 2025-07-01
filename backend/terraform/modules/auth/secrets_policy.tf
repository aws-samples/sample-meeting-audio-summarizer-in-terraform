# IAM policy for general AWS service access
resource "aws_iam_policy" "secrets_access_policy" {
  name        = "GeneralServiceAccessPolicy"
  description = "Policy to allow access to AWS services needed for the application"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Effect   = "Allow",
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })

  tags = var.tags
}
