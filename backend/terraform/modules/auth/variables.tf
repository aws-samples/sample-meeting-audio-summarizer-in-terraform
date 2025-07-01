variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account" {
  description = "AWS account ID"
  type        = string
}

variable "storage_bucket" {
  description = "Name of the S3 bucket for storage"
  type        = string
}

variable "meeting_summaries_table_name" {
  description = "Name of the DynamoDB table for meeting summaries"
  type        = string
}

variable "meeting_statistics_table_name" {
  description = "Name of the DynamoDB table for meeting statistics"
  type        = string
}

variable "model_id" {
  description = "Amazon Bedrock model ID for summarization"
  type        = string
}

variable "inference_profile_prefix" {
  description = "Prefix for the Bedrock inference profile"
  type        = string
  default     = "default"
}

variable "cognito_domain_prefix" {
  description = "Prefix for the Cognito domain"
  type        = string
}

variable "app_domain" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "cognito_user_setup_function_zip" {
  description = "Path to the zip file containing the Cognito user setup Lambda function code"
  type        = string
  default     = "../functions/zipped/CognitoUserSetupFunction.zip"
}

variable "username" {
  description = "Username for authenticated users"
  type        = string
  default     = "$${cognito-identity.amazonaws.com:sub}"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
variable "aws_profile" {
  description = "AWS CLI profile to use for authentication"
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  type        = string
  default     = ""
}

variable "cloudfront_domain" {
  description = "Domain name of the CloudFront distribution"
  type        = string
  default     = ""
}
