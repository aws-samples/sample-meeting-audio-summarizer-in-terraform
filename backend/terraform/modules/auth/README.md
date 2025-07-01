# Auth Module

This module sets up authentication and authorization for the meeting summarizer application.

## Resources Created

- Cognito User Pool
- Cognito Identity Pool
- IAM Roles and Policies
- Lambda execution roles

## Inputs

- `environment`: Deployment environment
- `app_name`: Application name
- `storage_bucket`: S3 bucket name for storage
- `dynamodb_table_arn`: ARN of the DynamoDB table

## Outputs

- `cognito_user_pool_id`: Cognito User Pool ID
- `cognito_user_pool_client_id`: Cognito User Pool Client ID
- `cognito_identity_pool_id`: Cognito Identity Pool ID
- `lambda_role_arn`: Lambda execution role ARN
