# Compute Module

This module sets up Lambda functions for the meeting summarizer application.

## Resources Created

- Lambda functions for audio processing
- Lambda functions for transcription
- Lambda functions for summarization
- Lambda functions for data access

## Inputs

- `environment`: Deployment environment
- `app_name`: Application name
- `storage_bucket`: S3 bucket name for storage
- `dynamodb_table_arn`: ARN of the DynamoDB table
- `cognito_user_pool_id`: Cognito User Pool ID
- `cognito_identity_pool_id`: Cognito Identity Pool ID
- `lambda_role_arn`: Lambda execution role ARN

## Outputs

- `lambda_functions`: Map of Lambda function ARNs and names
