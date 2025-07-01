# Data sources for region and account ID
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# IAM assume role policies
data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "state_machine_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["states.amazonaws.com"]
    }
  }
}

# Create Cognito Identity Pool
resource "aws_cognito_identity_pool" "identity_pool" {
  identity_pool_name               = "meetingsummariesidentitypool"
  allow_unauthenticated_identities = false
  allow_classic_flow               = false

  # Connect to the User Pool
  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.meeting_summary_client.id
    provider_name           = "cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.meeting_summary_pool.id}"
    server_side_token_check = false
  }

  tags = var.tags
}

# Create IAM roles for authenticated users
resource "aws_iam_role" "cognito_authenticated_role" {
  name = "cognitoauthenticatedrole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.identity_pool.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = var.tags
}

# Attach policy to authenticated role for S3 access
resource "aws_iam_policy" "authenticated_s3_policy" {
  name = "authenticateds3policy"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.storage_bucket}/audio/*",
          "arn:aws:s3:::${var.storage_bucket}/transcripts/*",
          "arn:aws:s3:::${var.storage_bucket}/summaries/*",
          "arn:aws:s3:::${var.storage_bucket}/transcribed-conversations/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = "arn:aws:s3:::${var.storage_bucket}"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ],
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.meeting_summaries_table_name}",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.meeting_statistics_table_name}"
        ]
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "authenticated_s3_policy_attachment" {
  role       = aws_iam_role.cognito_authenticated_role.name
  policy_arn = aws_iam_policy.authenticated_s3_policy.arn
}

# Attach identity pool roles
resource "aws_cognito_identity_pool_roles_attachment" "identity_pool_roles" {
  identity_pool_id = aws_cognito_identity_pool.identity_pool.id
  
  roles = {
    "authenticated" = aws_iam_role.cognito_authenticated_role.arn
  }
}
