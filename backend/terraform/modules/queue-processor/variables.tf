variable "storage_bucket" {
  type        = string
  description = "Name of the S3 bucket for audio files and transcripts"
}

variable "state_machine_arn" {
  type        = string
  description = "ARN of the Step Functions state machine"
}

variable "lambda_function_transcription_role" {
  type        = string
  description = "IAM role ARN for the Lambda function"
}

variable "processing_status_table_name" {
  type        = string
  description = "Name of the DynamoDB table for processing status"
}
