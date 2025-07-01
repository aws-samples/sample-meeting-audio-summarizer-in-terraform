# Meeting Audio Summarizer - Architecture Diagram Flow

This document provides a detailed description of the architecture flow for the Meeting Audio Summarizer application to help with creating an accurate architecture diagram.

## User Flow

1. **User Authentication**
   - User accesses the application through CloudFront distribution
   - Authentication is handled by Amazon Cognito
   - Upon successful authentication, user receives JWT tokens
   - Frontend application uses these tokens for authenticated API calls

2. **Audio Upload**
   - User uploads an audio file through the frontend application
   - Frontend makes an authenticated API call to AppSync GraphQL API
   - AppSync invokes the `UploadFileFunction` Lambda
   - Lambda generates a pre-signed URL for S3 upload
   - Frontend uses the pre-signed URL to upload the audio file directly to S3
   - Audio file is stored in the `audio/meetinguser/` prefix in the S3 bucket

## Processing Flow

1. **Queue Processing**
   - S3 bucket notification triggers when a new file is uploaded to `audio/meetinguser/` prefix
   - Notification sends a message to the SQS audio processing queue
   - `ProcessTranscriptionQueueFunction` Lambda is triggered by the SQS message
   - Lambda initiates the Step Functions workflow for audio processing

2. **Transcription Workflow** (Step Functions)
   - **ProcessAudioAndTranscribe**: Prepares the audio file for transcription
   - **ConfigureTranscription**: Validates the transcription job configuration
   - **SetTranscriptionParameters**: Sets parameters for the transcription job
   - **PollTranscriptionStatus**: Checks the status of the transcription job using `GetTranscriptionResultsFunction`
   - **CheckCompletion**: Determines if the transcription is complete
   - **WaitBeforePolling**: Waits before checking the status again if not complete
   - **ProcessTranscription**: Processes the completed transcription using `ProcessTranscriptionFunction`

3. **Parallel Processing**
   - Once transcription is complete, the workflow splits into two parallel branches:
     - **Summarization Branch**:
       - `SummarizeMeetingFunction` generates a summary using Amazon Bedrock
       - Summary is stored in the `summaries/` prefix in S3 bucket
     - **Statistics Branch**:
       - `ExtractMeetingStatisticsFunction` analyzes the transcript to extract statistics
       - Statistics are stored in DynamoDB

4. **Summary Storage**
   - When a new summary file is uploaded to the `summaries/` prefix in S3
   - S3 event notification directly triggers the `StoreSummaryInDatabaseFunction` Lambda
   - Lambda processes the summary and stores it in DynamoDB for quick retrieval

## Data Access Flow

1. **Retrieving Summaries**
   - User requests summaries through the frontend application
   - Frontend makes an authenticated API call to AppSync GraphQL API
   - AppSync invokes the `GetSummariesFunction` Lambda
   - Lambda retrieves summaries from DynamoDB and returns them to the user

2. **Searching Summaries**
   - User searches for summaries through the frontend application
   - Frontend makes an authenticated API call to AppSync GraphQL API
   - AppSync invokes the `SearchSummariesFunction` Lambda
   - Lambda performs a search in DynamoDB and returns matching summaries

3. **Retrieving Statistics**
   - User requests statistics through the frontend application
   - Frontend makes an authenticated API call to AppSync GraphQL API
   - AppSync invokes the `GetStatisticsFunction` Lambda
   - Lambda retrieves statistics from DynamoDB and returns them to the user

4. **Deleting Summaries**
   - User deletes summaries through the frontend application
   - Frontend makes an authenticated API call to AppSync GraphQL API
   - AppSync invokes the `DeleteSummariesFunction` Lambda
   - Lambda deletes summaries from DynamoDB and associated files from S3

## Key Components for Architecture Diagram

### Frontend Layer
- **CloudFront Distribution**: Global content delivery
- **S3 Bucket (Frontend)**: Hosts static web application files
- **Cognito User Pool**: User authentication and authorization

### API Layer
- **AppSync GraphQL API**: Unified API for frontend-backend communication
- **API Resolvers**: Connect to Lambda functions for data operations

### Processing Layer
- **S3 Bucket (Backend)**: Stores audio files, transcripts, and summaries
- **SQS Queue**: Reliable message processing for audio files
- **Step Functions**: Orchestrates the transcription and summarization workflow
- **Lambda Functions**: Execute specific tasks in the workflow

### Data Layer
- **DynamoDB Tables**:
  - Meeting Summaries Table: Stores meeting summaries
  - Meeting Statistics Table: Stores meeting statistics

### AI Services
- **Amazon Transcribe**: Speech-to-text conversion
- **Amazon Bedrock**: AI-powered summarization

### Monitoring
- **CloudWatch**: Monitoring, logging, and scheduled events

## Data Flow Connections

1. **Frontend to API**:
   - CloudFront → S3 (Frontend) → AppSync API

2. **Authentication Flow**:
   - Frontend → Cognito → AppSync API

3. **Audio Upload Flow**:
   - AppSync API → UploadFileFunction → S3 (Backend)

4. **Processing Flow**:
   - S3 (Backend) → SQS Queue → ProcessTranscriptionQueueFunction → Step Functions
   - Step Functions → Transcribe → ProcessTranscriptionFunction
   - Step Functions → SummarizeMeetingFunction → Bedrock → S3 (summaries)
   - Step Functions → ExtractMeetingStatisticsFunction → DynamoDB

5. **Summary Storage Flow**:
   - S3 (summaries) → StoreSummaryInDatabaseFunction → DynamoDB

6. **Data Access Flow**:
   - AppSync API → Lambda Functions → DynamoDB

## Key Interactions to Highlight

1. Direct S3 event notifications triggering Lambda functions
2. SQS queue for reliable audio processing
3. Step Functions for orchestrating the workflow
4. Parallel processing of summaries and statistics
5. DynamoDB for storing and retrieving structured data
