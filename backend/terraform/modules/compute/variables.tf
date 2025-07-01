variable "aws_region" {
  type        = string
  description = "AWS Region for deployment"
}

variable "aws_account" {
  type        = string
  description = "AWS Account ID"
}

variable "storage_bucket" {
  type        = string
  description = "Name of the S3 bucket for audio files and transcripts"
}

variable "model_id" {
  type        = string
  description = "Amazon Bedrock model ID for summarization"
}

variable "inference_profile_prefix" {
  type        = string
  description = "Inference profile for US models"
}

variable "iam_roles" {
  type        = map(string)
  description = "IAM roles for Lambda functions"
}

variable "cognito_user_pool_id" {
  type        = string
  description = "ID of the Cognito user pool"
}

variable "meeting_statistics_table_name" {
  type        = string
  description = "Name of the DynamoDB table for meeting statistics"
}

variable "meeting_summaries_table_name" {
  type        = string
  description = "Name of the DynamoDB table for meeting summaries"
}

variable "processing_status_table_name" {
  type        = string
  description = "Name of the DynamoDB table for processing status"
}

variable "cloudfront_domain_name" {
  type        = string
  description = "Domain name of the CloudFront distribution"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"
  default     = "dev"
}

variable "app_name" {
  type        = string
  description = "Application name"
  default     = "meeting-summarizer"
}
