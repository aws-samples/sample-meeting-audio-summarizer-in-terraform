variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
}

variable "aws_profile" {
  description = "AWS CLI profile to use for authentication"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
}

variable "dynamodb_read_capacity" {
  description = "DynamoDB read capacity units"
  type        = number
}

variable "dynamodb_write_capacity" {
  description = "DynamoDB write capacity units"
  type        = number
}

variable "cognito_allowed_email_domains" {
  description = "List of email domains allowed for Cognito signup"
  type        = list(string)
}

variable "model_id" {
  type        = string
  description = "Amazon Bedrock model ID for summarization"
}

variable "inference_profile_prefix" {
  type        = string
  description = "Inference profile for US models"
}

variable "frontend_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for the frontend"
}

variable "storage_bucket" {
  type        = string
  description = "Name of the S3 bucket for audio files and transcripts"
}

variable "cognito_domain_prefix" {
  description = "Prefix for the Cognito domain"
  type        = string
}

variable "meeting_statistics_table_name" {
  description = "Name of the DynamoDB table for meeting statistics"
  type        = string
}

variable "meeting_summaries_table_name" {
  description = "Name of the DynamoDB table for meeting summaries"
  type        = string
}

