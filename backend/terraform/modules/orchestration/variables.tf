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

variable "lambda_functions" {
  type        = map(string)
  description = "ARNs of Lambda functions used in the Step Functions workflow"
}

variable "iam_roles" {
  type        = map(string)
  description = "IAM roles for Step Functions and Lambda"
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}

variable "unique_suffix" {
  type        = string
  description = "Unique suffix to append to resource names"
  default     = ""
}

