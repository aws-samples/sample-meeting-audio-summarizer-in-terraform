# Storage Module

This module sets up storage resources for the meeting summarizer application.

## Resources Created

- S3 bucket for audio files and transcripts
- DynamoDB table for meeting summaries

## Inputs

- `environment`: Deployment environment
- `app_name`: Application name
- `dynamodb_read_capacity`: DynamoDB read capacity units
- `dynamodb_write_capacity`: DynamoDB write capacity units

## Outputs

- `storage_bucket_name`: S3 bucket name
- `dynamodb_table_arn`: DynamoDB table ARN
- `dynamodb_table_name`: DynamoDB table name
