output "storage_bucket" {
  value = aws_s3_bucket.storage_bucket.bucket
}

output "storage_bucket_arn" {
  value = aws_s3_bucket.storage_bucket.arn
}

output "meeting_statistics_table_name" {
  value = aws_dynamodb_table.meeting_statistics.name
}

output "meeting_statistics_table_arn" {
  value = aws_dynamodb_table.meeting_statistics.arn
}

output "meeting_summaries_table_name" {
  value = aws_dynamodb_table.meeting_summaries.name
}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.meeting_summaries.arn
  description = "ARN of the DynamoDB table for meeting summaries"
}

output "processing_status_table_arn" {
  description = "ARN of the DynamoDB table for processing status"
  value       = aws_dynamodb_table.processing_status.arn
}

output "processing_status_table_name" {
  description = "Name of the DynamoDB table for processing status"
  value       = aws_dynamodb_table.processing_status.name
}
