# Backend

This directory contains the backend infrastructure and code for the meeting summarizer application.

## Directory Structure

- **terraform/**: Infrastructure as Code using Terraform
  - **modules/**: Terraform modules for different AWS services
    - **api/**: AppSync GraphQL API
    - **auth/**: Cognito and IAM resources
    - **compute/**: Lambda functions
    - **network/**: CloudFront distribution
    - **orchestration/**: Step Functions
    - **storage/**: S3 and DynamoDB resources
  - **environments/**: Environment-specific configurations

- **functions/**: Lambda function code
  - **audio-processing/**: Functions for handling audio files
  - **transcription/**: Functions for transcribing audio
  - **summarization/**: Functions for generating summaries
  - **data-access/**: Functions for data operations
  - **deployment-packages/**: Deployment packages for Lambda functions

## Deployment

To deploy the backend infrastructure:

1. Navigate to the terraform directory:
   ```
   cd terraform
   ```

2. Initialize Terraform:
   ```
   terraform init
   ```

3. Apply the Terraform configuration:
   ```
   terraform apply
   ```

4. After deployment, Terraform will output important information like API endpoints and Cognito pool IDs.
