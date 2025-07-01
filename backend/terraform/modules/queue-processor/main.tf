resource "aws_lambda_function" "transcription_queue_processor_function" {
  function_name    = "ProcessTranscriptionQueueFunction"
  description      = "Lambda function that processes messages from the SQS queue for audio files and summaries."
  filename         = "${path.module}/../../../functions/zipped/ProcessTranscriptionQueueFunction.zip"
  role             = var.lambda_function_transcription_role
  handler          = "ProcessTranscriptionQueueFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 300
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/ProcessTranscriptionQueueFunction.zip")
  publish = true

  environment {
    variables = {
      STORAGE_BUCKET = var.storage_bucket,
      STATE_MACHINE_ARN = var.state_machine_arn,
      PROCESSING_STATUS_TABLE = var.processing_status_table_name
    }
  }
}

resource "aws_lambda_alias" "transcription_queue_processor_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.transcription_queue_processor_function.function_name
  function_version = aws_lambda_function.transcription_queue_processor_function.version
}

resource "aws_lambda_function_event_invoke_config" "transcription_queue_processor_config" {
  function_name                = aws_lambda_function.transcription_queue_processor_function.function_name
  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600
}
