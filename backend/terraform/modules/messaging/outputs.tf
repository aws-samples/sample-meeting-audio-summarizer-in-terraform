 output "audio_processing_queue_url" {
  description = "URL of the audio processing SQS queue"
  value       = aws_sqs_queue.audio_processing_queue.url
}

output "audio_processing_queue_arn" {
  description = "ARN of the audio processing SQS queue"
  value       = aws_sqs_queue.audio_processing_queue.arn
}

output "audio_processing_dlq_url" {
  description = "URL of the audio processing dead-letter queue"
  value       = aws_sqs_queue.audio_processing_dlq.url
}
