# Lambda Functions

This directory contains the source code for all Lambda functions used in the application.

## Directory Structure

- **audio-processing/**: Functions for handling audio file uploads and processing
- **transcription/**: Functions for transcribing audio files
- **summarization/**: Functions for generating and processing summaries
- **data-access/**: Functions for data operations (get, store, search summaries)
- **deployment-packages/**: Contains deployment packages (zip files) for Lambda functions

## Deployment

Lambda functions are deployed using Terraform. The deployment process:

1. Creates zip packages for each function
2. Uploads them to S3
3. Creates or updates Lambda functions with the new code

See the Terraform configuration in `../terraform/modules/compute` for details.
