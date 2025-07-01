variable "storage_bucket" {
  description = "Name of the S3 bucket for audio files and transcripts"
  type        = string
}

variable "transcription_queue_processor_function_arn" {
  description = "ARN of the TranscriptionQueueProcessor Lambda function"
  type        = string
  default     = ""
}

variable "transcription_queue_processor_function_name" {
  description = "Name of the TranscriptionQueueProcessor Lambda function"
  type        = string
  default     = ""
}

variable "summarize_meeting_function_arn" {
  description = "ARN of the SummarizeMeeting Lambda function"
  type        = string
  default     = ""
}

variable "summarize_meeting_function_name" {
  description = "Name of the SummarizeMeeting Lambda function"
  type        = string
  default     = ""
}

variable "store_summary_in_database_function_arn" {
  description = "ARN of the StoreSummaryInDatabase Lambda function"
  type        = string
  default     = ""
}

variable "store_summary_in_database_function_name" {
  description = "Name of the StoreSummaryInDatabase Lambda function"
  type        = string
  default     = ""
}

variable "state_machine_arn" {
  description = "ARN of the Step Functions state machine"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Deployment environment (e.g., dev, prod)"
  type        = string   
}

variable "app_name" {
  description = "Application name"
  type        = string 
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
