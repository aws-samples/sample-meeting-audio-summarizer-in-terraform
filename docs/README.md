# Documentation

This directory contains documentation resources for the Meeting Audio Summarizer application.

## Contents

- **architecture-diagram.png**: High-level architecture diagram of the application
- Add additional documentation files as needed

## Architecture Overview

The Meeting Audio Summarizer uses a serverless architecture on AWS with the following components:

1. **Frontend**: React application hosted on S3/CloudFront
2. **API Layer**: AppSync GraphQL API
3. **Authentication**: Amazon Cognito
4. **Processing Pipeline**: AWS Step Functions
5. **Compute**: AWS Lambda functions
6. **Storage**: Amazon S3 and DynamoDB
7. **AI Services**: Amazon Transcribe and Amazon Bedrock

## Creating Architecture Diagrams

To update the architecture diagram:

1. Use a tool like [draw.io](https://draw.io) or [Lucidchart](https://lucidchart.com)
2. Export as PNG with high resolution
3. Replace the existing architecture-diagram.png file
