# Orchestration Module

This module sets up Step Functions for orchestrating the meeting summarizer workflow.

## Resources Created

- Step Functions state machine
- IAM roles and policies for Step Functions

## Inputs

- `environment`: Deployment environment
- `app_name`: Application name
- `lambda_functions`: Map of Lambda function ARNs and names

## Outputs

- `state_machine_arn`: Step Functions state machine ARN
