variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
}

variable "user_pool_id" {
  description = "Cognito User Pool ID for API authentication"
  type        = string
}

variable "lambda_functions" {
  description = "Map of Lambda function names to ARNs"
  type        = map(string)
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = ""
}

variable "delete_summaries_function_arn" {
  description = "ARN of the Lambda function for deleting summaries"
  type        = string
  default     = ""
}

variable "lambda_role_arn" {
  description = "ARN of the IAM role for Lambda functions"
  type        = string
  default     = ""
}
