# API Module

This module sets up the AppSync GraphQL API for the meeting summarizer application.

## Resources Created

- AppSync API
- GraphQL Schema
- Data Sources (Lambda functions, DynamoDB)
- Resolvers for queries and mutations

## Inputs

- `environment`: Deployment environment
- `app_name`: Application name
- `user_pool_id`: Cognito User Pool ID for authentication
- `lambda_functions`: Map of Lambda functions for data sources
- `dynamodb_table_arn`: ARN of the DynamoDB table

## Outputs

- `api_endpoint`: AppSync API endpoint URL
- `api_id`: AppSync API ID
