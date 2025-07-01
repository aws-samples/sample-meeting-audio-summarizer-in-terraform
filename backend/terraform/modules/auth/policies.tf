# IAM policy for combined transcription processing
resource "aws_iam_policy" "transcription_processing_policy" {
  name        = "TranscriptionProcessingPolicy"
  description = "Policy for combined language detection and transcription initiation"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob",
          "transcribe:ListTranscriptionJobs"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "comprehend:DetectDominantLanguage",
          "comprehend:BatchDetectDominantLanguage"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:s3:::${var.storage_bucket}",
          "arn:aws:s3:::${var.storage_bucket}/*"
        ]
      },
      {
        Action = [
          "iam:PassRole"
        ],
        Effect   = "Allow",
        Resource = "*"
      },
      {
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ],
        Effect   = "Allow",
        Resource = "*"
      },
      {
        Action = [
          "states:StartExecution"
        ],
        Effect   = "Allow",
        Resource = "*"
      }
    ]
  })
}

# IAM policy for combined summarization
resource "aws_iam_policy" "summarization_policy" {
  name        = "SummarizationPolicy"
  description = "Policy for combined summarization and storage"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "bedrock:InvokeModel",
          "bedrock:GetInvokeModel"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.meeting_summaries_table_name}",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.meeting_statistics_table_name}"
        ]
      },
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:s3:::${var.storage_bucket}",
          "arn:aws:s3:::${var.storage_bucket}/*"
        ]
      }
    ]
  })
}

# IAM policy for Step Functions execution
resource "aws_iam_policy" "step_functions_execution_policy" {
  name        = "StepFunctionsExecutionPolicy"
  description = "Policy for executing Step Functions state machines"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "states:StartExecution",
          "states:DescribeExecution",
          "states:GetExecutionHistory"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# IAM policy for Cognito management
resource "aws_iam_policy" "cognito_management_policy" {
  name        = "CognitoManagementPolicy"
  description = "Policy for managing Cognito user pools"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:ListUsers",
          "cognito-idp:ListUsersInGroup"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# IAM policy for Cognito post confirmation
resource "aws_iam_policy" "cognito_post_confirmation_policy" {
  name        = "CognitoPostConfirmationPolicy"
  description = "Policy for Cognito post confirmation Lambda function"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminGetUser"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# IAM policy for DynamoDB access
resource "aws_iam_policy" "dynamodb_access_policy" {
  name        = "DynamoDBAccessPolicy"
  description = "Policy for accessing DynamoDB tables"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:DescribeTable"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.meeting_summaries_table_name}",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.meeting_statistics_table_name}",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.meeting_statistics_table_name}/index/*",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/*-processing-status-*",
          "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/*-processing-status-*/index/*"
        ]
      }
    ]
  })
}

# IAM policy for Bedrock invoke model
resource "aws_iam_policy" "bedrock_invoke_model_policy" {
  name        = "BedrockInvokeModelPolicy"
  description = "Policy for invoking Bedrock models"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "bedrock:GetFoundationModel",
          "bedrock:GetInferenceProfile",
          "bedrock:InvokeModel",
          "bedrock:ListFoundationModels"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:bedrock:*::foundation-model/${var.model_id}",
          "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.inference_profile_prefix}.${var.model_id}"
        ]
      }
    ]
  })
}

# IAM policy for Transcribe access
resource "aws_iam_policy" "transcribe_access_policy" {
  name        = "TranscribeAccessPolicy"
  description = "Policy for accessing Amazon Transcribe"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob",
          "transcribe:ListTranscriptionJobs"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# IAM policy for S3 write access
resource "aws_iam_policy" "s3_write_policy" {
  name        = "S3WritePolicy"
  description = "Policy for writing to S3 buckets"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:s3:::${var.storage_bucket}",
          "arn:aws:s3:::${var.storage_bucket}/*"
        ]
      }
    ]
  })
}

# IAM policy for Step Functions Lambda invoke
resource "aws_iam_policy" "step_functions_lambda_invoke_policy" {
  name        = "StepFunctionsLambdaInvokePolicy"
  description = "Policy for Step Functions to invoke Lambda functions"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "lambda:InvokeFunction"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:ProcessTranscriptionFunction",
          "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:GetTranscriptionResultsFunction",
          "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:ProcessTranscriptionFunction",
          "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:SummarizeMeetingFunction",
          "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:ExtractMeetingStatisticsFunction",
          "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:UpdateProcessingStatusFunction"
        ]
      }
    ]
  })
}

# IAM policy for Lambda functions to invoke other Lambda functions
resource "aws_iam_policy" "lambda_invoke_policy" {
  name        = "LambdaInvokePolicy"
  description = "Policy for Lambda functions to invoke other Lambda functions"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "lambda:InvokeFunction"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:UpdateProcessingStatusFunction"
        ]
      }
    ]
  })
}