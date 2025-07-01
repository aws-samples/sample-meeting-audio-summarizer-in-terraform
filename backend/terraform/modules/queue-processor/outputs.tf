output "transcription_queue_processor_function_arn" {
  description = "ARN of the ProcessTranscriptionQueueFunction Lambda function"
  value       = aws_lambda_function.transcription_queue_processor_function.arn
}

output "transcription_queue_processor_function_name" {
  description = "Name of the ProcessTranscriptionQueueFunction Lambda function"
  value       = aws_lambda_function.transcription_queue_processor_function.function_name
}
