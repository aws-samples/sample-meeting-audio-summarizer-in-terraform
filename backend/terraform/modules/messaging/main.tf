resource "aws_sqs_queue" "audio_processing_queue" {
  name                        = "${var.app_name}-${var.environment}-audio-processing-queue"
  visibility_timeout_seconds  = 300
  message_retention_seconds   = 86400
  max_message_size            = 262144
  delay_seconds               = 0
  receive_wait_time_seconds   = 20
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.audio_processing_dlq.arn
    maxReceiveCount     = 3
  })
  
  tags = var.tags
}

resource "aws_sqs_queue" "audio_processing_dlq" {
  name                        = "${var.app_name}-${var.environment}-audio-processing-dlq"
  message_retention_seconds   = 1209600
  
  tags = var.tags
}

resource "aws_s3_bucket_notification" "audio_upload_notification" {
  bucket = var.storage_bucket
  
  queue {
    queue_arn     = aws_sqs_queue.audio_processing_queue.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "audio/"
  }
  
  lambda_function {
    lambda_function_arn = var.store_summary_in_database_function_arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "summaries/"
  }
}

resource "aws_sqs_queue_policy" "audio_processing_queue_policy" {
  queue_url = aws_sqs_queue.audio_processing_queue.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "sqs:SendMessage"
        Resource = aws_sqs_queue.audio_processing_queue.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:s3:::${var.storage_bucket}"
          }
        }
      }
    ]
  })
}

resource "aws_lambda_event_source_mapping" "transcription_queue_processor_mapping" {
  event_source_arn = aws_sqs_queue.audio_processing_queue.arn
  function_name    = var.transcription_queue_processor_function_arn
  batch_size       = 1
  enabled          = true
}

resource "aws_lambda_function_event_invoke_config" "transcription_queue_processor_config" {
  count                        = var.transcription_queue_processor_function_name != "" ? 1 : 0
  function_name                = var.transcription_queue_processor_function_name
  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600
}

resource "aws_lambda_permission" "allow_sqs_to_invoke_lambda" {
  count         = var.transcription_queue_processor_function_name != "" ? 1 : 0
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = var.transcription_queue_processor_function_name
  principal     = "sqs.amazonaws.com"
  source_arn    = aws_sqs_queue.audio_processing_queue.arn
}

resource "aws_lambda_permission" "allow_s3_to_invoke_store_summary_in_database" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = var.store_summary_in_database_function_name
  principal     = "s3.amazonaws.com"
  source_arn    = "arn:aws:s3:::${var.storage_bucket}"
}
