variable "frontend_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for the frontend"
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}
