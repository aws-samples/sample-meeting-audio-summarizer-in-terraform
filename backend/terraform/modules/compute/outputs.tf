output "get_statistics_function_arn" {
  description = "ARN of the GetStatisticsFunction Lambda function"
  value       = aws_lambda_function.get_statistics_function.arn
}

output "get_statistics_function_name" {
  description = "Name of the GetStatisticsFunction Lambda function"
  value       = aws_lambda_function.get_statistics_function.function_name
}

output "store_summary_in_database_function_arn" {
  description = "ARN of the StoreSummaryInDatabaseFunction Lambda function"
  value       = aws_lambda_function.store_summary_in_database_function.arn
}

output "store_summary_in_database_function_name" {
  description = "Name of the StoreSummaryInDatabaseFunction Lambda function"
  value       = aws_lambda_function.store_summary_in_database_function.function_name
}

output "summarize_meeting_function_name" {
  description = "Name of the SummarizeMeetingFunction Lambda function"
  value       = aws_lambda_function.summarize_meeting_function.function_name
}

output "summarize_meeting_function_arn" {
  description = "ARN of the SummarizeMeetingFunction Lambda function"
  value       = aws_lambda_function.summarize_meeting_function.arn
}

output "get_processing_status_function_arn" {
  description = "ARN of the GetProcessingStatusFunction Lambda function"
  value       = aws_lambda_function.get_processing_status_function.arn
}

output "get_processing_status_function_name" {
  description = "Name of the GetProcessingStatusFunction Lambda function"
  value       = aws_lambda_function.get_processing_status_function.function_name
}

output "update_processing_status_function_arn" {
  description = "ARN of the UpdateProcessingStatusFunction Lambda function"
  value       = aws_lambda_function.update_processing_status_function.arn
}

output "update_processing_status_function_name" {
  description = "Name of the UpdateProcessingStatusFunction Lambda function"
  value       = aws_lambda_function.update_processing_status_function.function_name
}

output "lambda_functions" {
  description = "Map of Lambda function ARNs"
  value = {
    upload_file_function_arn = aws_lambda_function.upload_file_function.arn
    get_summaries_function_arn = aws_lambda_function.get_summaries_function.arn
    get_statistics_function_arn = aws_lambda_function.get_statistics_function.arn
    search_summaries_function_arn = aws_lambda_function.search_summaries_function.arn
    process_transcription_function_arn = aws_lambda_function.process_transcription_function.arn
    get_transcription_results_function_arn = aws_lambda_function.get_transcription_results_function.arn
    summarize_meeting_function_arn = aws_lambda_function.summarize_meeting_function.arn
    extract_meeting_statistics_function_arn = aws_lambda_function.extract_meeting_statistics_function.arn
    delete_summaries_function_arn = aws_lambda_function.delete_summaries_function.arn
    store_summary_in_database_function_arn = aws_lambda_function.store_summary_in_database_function.arn
    store_summary_in_s3_function_arn = aws_lambda_function.store_summary_in_s3_function.arn
    get_processing_status_function_arn = aws_lambda_function.get_processing_status_function.arn
    update_processing_status_function_arn = aws_lambda_function.update_processing_status_function.arn
  }
}
