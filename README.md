# Meeting Audio Summarizer

This repository contains a serverless application that transcribes, summarizes, and analyzes meeting audio recordings using AWS services. The application leverages Amazon Transcribe for speech-to-text conversion and Amazon Bedrock (Claude 3 Sonnet) for AI-powered summarization.

## Architecture Overview

The architecture follows AWS best practices for scalability, security, and reliability. It uses a serverless approach with direct S3 triggers and SQS queues for efficient event-driven processing. The application includes the following key components:

![Meeting Audio Summarizer Architecture](/docs/architecture-diagram.png)

## Key Components

### Frontend
- **S3 & CloudFront**: Hosts and delivers the static web application with global content delivery
- **Cognito**: Handles user authentication and authorization with self-registration flow

### API Layer
- **AppSync GraphQL API**: Provides a unified API for frontend-backend communication with comprehensive schema for meeting data

### Backend Services
1. **Authentication**
   - Cognito User Pools for secure user authentication
   - IAM roles with least privilege for service-to-service authentication
   - Secure API access with Cognito authorizers

2. **Audio Processing**
   - Lambda functions for file upload and language detection
   - S3 for audio file storage with lifecycle management
   - SQS queue for reliable audio file processing

3. **Queue Processing**
   - TranscriptionQueueProcessor Lambda for handling SQS messages
   - Dead-letter queue for failed message handling
   - Event source mappings for automatic queue processing

4. **Transcription**
   - Lambda functions for transcription workflow
   - Amazon Transcribe for speech-to-text conversion

5. **Summarization**
   - Lambda functions for generating meeting summaries
   - Amazon Bedrock for AI-powered summarization
   - Direct S3 triggers for efficient processing

6. **Data Access**
   - Lambda functions for CRUD operations
   - DynamoDB for storing meeting summaries and statistics

### Orchestration
### Orchestration
- **Step Functions**: Coordinates the end-to-end workflow for audio processing
- **S3 Event Notifications**: Directly triggers Lambda functions for efficient processing
- **SQS Queues**: Provides reliable message processing for audio files

### Monitoring
- **CloudWatch**: Centralized monitoring and logging

## Prerequisites

Before deploying this application, you'll need:

1. **AWS Account**: An AWS account with appropriate permissions to create the required resources
2. **AWS CLI**: Installed and configured with appropriate credentials
3. **Terraform**: Version 1.0.0 or later
4. **Node.js**: Version 14.x or later
5. **npm**: Version 6.x or later
6. **Python**: Version 3.8 or later (for Lambda functions)
7. **Amazon Bedrock Access**: Ensure you have access to Amazon Bedrock and the required models

## Project Structure

```
sample-meeting-audio-summarizer-in-terraform/
├── backend/
│   ├── functions/                           # Lambda function code
│   │   ├── audio-processing/                # Audio processing functions
│   │   ├── authentication/                  # Authentication functions
│   │   ├── data-access/                     # Data access functions
│   │   ├── queue-processing/                # SQS queue processing functions
│   │   ├── summarization/                   # Summarization functions
│   │   ├── transcription/                   # Transcription functions
│   │   └── zipped/                          # Zipped Lambda functions for deployment
│   └── terraform/                           # Infrastructure as Code
│       ├── modules/                         # Terraform modules
│       │   ├── api/                         # AppSync GraphQL API
│       │   ├── auth/                        # Cognito authentication
│       │   ├── compute/                     # Lambda functions
│       │   ├── messaging/                   # SQS queues and S3 notifications
│       │   ├── network/                     # CloudFront and S3 website
│       │   ├── orchestration/               # Step Functions
│       │   ├── queue-processor/             # Queue processing Lambda
│       │   └── storage/                     # S3 and DynamoDB
│       ├── main.tf                          # Main Terraform configuration
│       ├── outputs.tf                       # Output values
│       ├── variables.tf                     # Input variables
│       └── terraform.tfvars                 # Variable values
├── docs/                                    # Documentation and architecture diagrams
├── frontend/                                # React web application
│   ├── public/                              # Public assets
│   └── src/                                 # React application source
│       ├── components/                      # React components                                                       
│       ├── graphql/                         # GraphQL queries and mutations
│       ├── pages/                           # Page components
│       └── services/                        # Service integrations
└── scripts/                                 # Deployment and utility scripts
    ├── deploy.sh                            # Main deployment script
    └── zip-lambdas.sh                       # Lambda packaging script
```

## Lambda Functions

The application includes the following Lambda functions organized by category:

### Audio Processing
- **UploadFileFunction**: Securely processes audio file uploads, validates formats, and stores in S3

### Authentication
- **CognitoPostConfirmationTrigger**: Adds confirmed users to the app_users group after email verification

### Queue Processing
- **ProcessTranscriptionQueueFunction**: Processes messages from SQS queue and triggers the Step Functions workflow

### Data Access
- **DeleteSummariesFunction**: Handles batch deletion of meeting summaries from DynamoDB and S3
- **ExtractMeetingStatisticsFunction**: Analyzes transcription data to extract meaningful statistics
- **GetStatisticsFunction**: Retrieves and aggregates meeting analytics data
- **GetSummariesFunction**: Retrieves and paginates multiple meeting summaries
- **SearchSummariesFunction**: Performs full-text search across meeting summaries

### Summarization
- **StoreSummaryInDatabaseFunction**: Transforms and persists meeting summary data from S3 to DynamoDB (triggered by S3 events)
- **StoreSummaryInS3Function**: Stores generated summaries in S3
- **SummarizeMeetingFunction**: Leverages Amazon Bedrock (Claude 3 Sonnet) to generate concise meeting summaries

### Transcription
- **GetTranscriptionResultsFunction**: Retrieves and processes completed transcription job results
- **ProcessTranscriptionFunction**: Transforms raw transcription data into structured format

## Authentication Flow

The application uses Amazon Cognito for authentication with a self-registration flow:

1. Users sign up with their email address
2. Cognito sends a verification code to the user's email
3. After verification, users are automatically added to the "app_users" group
4. Users can then sign in to access the application

## Deployment Instructions

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/meeting-audio-summarizer.git
cd meeting-audio-summarizer
```

### Step 2: Configure Terraform Variables

Create a `terraform.tfvars` file in the `backend/terraform` directory with the following variables:

```hcl
aws_region                              = "us-east-1"
aws_profile                             = "YOUR-AWS-PROFILE"
environment                             = "prod"
app_name                                = "meeting-audio-summarizer"
dynamodb_read_capacity                  = 5
dynamodb_write_capacity                 = 5
cognito_allowed_email_domains           = ["example.com"]
model_id                                = "anthropic.claude-3-7-sonnet-20250219-v1:0"
inference_profile_prefix                = "us"
frontend_bucket_name                    = "a-unique-bucket-name"
storage_bucket                          = "a-unique-bucket-name"
cognito_domain_prefix                   = "meeting-summarizer"
meeting_statistics_table_name           = "MeetingStatistics"
meeting_summaries_table_name            = "MeetingSummaries"
```

Adjust the values according to your preferences and requirements.

### Step 3: Deploy Backend Infrastructure

```bash
cd backend/terraform
terraform init
terraform apply
```

Review the planned changes and type `yes` to proceed with the deployment.

### Step 4: Deploy Frontend

The frontend deployment script automatically configures the React application with the backend resources created by Terraform and deploys both backend and frontend:

```bash
cd scripts
./deploy.sh
```

This script will:
- Deploy the Terraform infrastructure
- Build the React frontend with the correct AWS configuration
- Upload the frontend to S3
- Invalidate the CloudFront cache

### Step 5: Access the Application

After successful deployment with the `./deploy.sh` script, you'll see output similar to:

```
Deployment complete! :)

============================================================================
Your app is available at: https://<cloudfront_distribution_domain>
============================================================================
```

Navigate to the provided CloudFront URL in your web browser.

## User Guide

### Registration and Login

1. Navigate to the application URL
2. Click "Create an account" to register
3. Enter your email address and create a password
4. Verify your email address using the code sent to your inbox
5. Sign in with your credentials

### Uploading Audio Files

1. Navigate to the "Upload" page
2. Click "Choose File" or drag and drop an audio file (MP3 format)
3. Add optional metadata (title, date, context)
4. Click "Upload" to start processing
5. You'll be redirected to the dashboard while processing continues

### Viewing Summaries

1. Navigate to the "Summaries" page to see all processed recordings
2. Use the search and filter options to find specific summaries
3. Click on a summary to view its details
4. Download or print summaries as needed

### Dashboard and Statistics

1. The dashboard provides an overview of recent summaries and key statistics
2. The "Statistics" page offers detailed analytics about your meetings
3. View trends, meeting durations, and other insights

## Troubleshooting

### Common Issues

1. **Upload Failures**
   - Ensure audio files are in supported formats (MP3, WAV, etc.)
   - Check file size limits (maximum 100MB)
   - Verify AWS credentials have appropriate permissions

2. **Processing Delays**
   - Large audio files may take longer to process
   - Check the AWS Management Console for Step Functions execution status
   - Verify Lambda function logs in CloudWatch

3. **Authentication Issues**
   - Ensure email verification is completed
   - Check Cognito user pool status in AWS Console
   - Verify frontend configuration in aws-exports.js

### Viewing Logs

To view logs for troubleshooting:

1. Navigate to AWS CloudWatch in the AWS Management Console
2. Select "Log Groups"
3. Find the log group for the specific Lambda function
4. Review the logs for error messages

## AWS Best Practices Implemented

1. **Scalability**
   - Serverless architecture with Lambda functions
   - DynamoDB for scalable NoSQL storage
   - CloudFront for global content delivery

2. **Security**
   - Cognito for authentication and authorization
   - IAM roles with least privilege
   - Encrypted data at rest and in transit

3. **Reliability**
   - Step Functions for workflow orchestration
   - Error handling and retry mechanisms
   - Asynchronous processing for long-running tasks

4. **Cost Optimization**
   - Serverless pay-per-use model
   - S3 lifecycle policies for tiered storage
   - Efficient resource utilization

5. **Operational Excellence**
   - CloudWatch for monitoring and logging
   - Infrastructure as Code with Terraform
   - Modular architecture for easier maintenance

## Customization Options

### Changing the Bedrock Model

To use a different Bedrock model:

1. Update the `model_id` variable in `terraform.tfvars` (currently set to Claude 3 Sonnet)
2. Modify the prompt template in `SummarizeMeetingFunction.py` if needed
3. Redeploy the backend infrastructure

### Email Notifications

The application uses Cognito's built-in email capabilities for user verification and password reset emails. No additional email configuration is required.

### Frontend Customization

To customize the frontend appearance:

1. Modify the React components in `frontend/src/components`
2. Update styles in the TailwindCSS configuration
3. Rebuild and redeploy the frontend

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- AWS for providing the cloud infrastructure and AI services
- The React and TailwindCSS communities for frontend tools
- All contributors who have helped improve this project
