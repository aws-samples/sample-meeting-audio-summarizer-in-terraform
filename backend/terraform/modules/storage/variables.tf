variable "storage_bucket" {
  type        = string
  description = "Name of the S3 bucket for audio files and transcripts"
  default     = null  # Will be set dynamically using the random suffix
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
}

variable "store_summary_in_database_function_arn" {
  description = "ARN of the StoreSummaryInDatabaseFunction Lambda function"
  type        = string
  default     = null
}

variable "start_state_machine_lambda_arn" {
  description = "ARN of the StartStateMachineFunction Lambda function"
  type        = string
  default     = null
}