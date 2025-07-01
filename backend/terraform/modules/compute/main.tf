# Upload File Function
resource "aws_lambda_function" "upload_file_function" {
  function_name    = "UploadFileFunction"
  description      = "Lambda function that handles file uploads."
  filename         = "${path.module}/../../../functions/zipped/UploadFileFunction.zip"
  role             = var.iam_roles.file_upload_role
  handler          = "UploadFileFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/UploadFileFunction.zip")
  publish = true

  environment {
    variables = {
      STORAGE_BUCKET = var.storage_bucket
      UPDATE_PROCESSING_STATUS_FUNCTION_NAME = "UpdateProcessingStatusFunction"
    }
  }
}

resource "aws_lambda_alias" "upload_file_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.upload_file_function.function_name
  function_version = aws_lambda_function.upload_file_function.version
}

# Get Summaries Function
resource "aws_lambda_function" "get_summaries_function" {
  function_name    = "GetSummariesFunction"
  description      = "Lambda function that retrieves meeting summaries."
  filename         = "${path.module}/../../../functions/zipped/GetSummariesFunction.zip"
  role             = var.iam_roles.meeting_summary_search_role
  handler          = "GetSummariesFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/GetSummariesFunction.zip")
  publish = true

  environment {
    variables = {
      DYNAMODB_TABLE = var.meeting_summaries_table_name
    }
  }
}

resource "aws_lambda_alias" "get_summaries_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.get_summaries_function.function_name
  function_version = aws_lambda_function.get_summaries_function.version
}

# Get Statistics Function
resource "aws_lambda_function" "get_statistics_function" {
  function_name    = "GetStatisticsFunction"
  description      = "Lambda function that retrieves meeting statistics."
  filename         = "${path.module}/../../../functions/zipped/GetStatisticsFunction.zip"
  role             = var.iam_roles.meeting_statistics_role
  handler          = "GetStatisticsFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/GetStatisticsFunction.zip")
  publish = true

  environment {
    variables = {
      DYNAMODB_TABLE = var.meeting_statistics_table_name
    }
  }
}

resource "aws_lambda_alias" "get_statistics_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.get_statistics_function.function_name
  function_version = aws_lambda_function.get_statistics_function.version
}

# Search Summaries Function
resource "aws_lambda_function" "search_summaries_function" {
  function_name    = "SearchSummariesFunction"
  description      = "Lambda function that searches meeting summaries."
  filename         = "${path.module}/../../../functions/zipped/SearchSummariesFunction.zip"
  role             = var.iam_roles.meeting_summary_search_role
  handler          = "SearchSummariesFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/SearchSummariesFunction.zip")
  publish = true

  environment {
    variables = {
      DYNAMODB_TABLE = var.meeting_summaries_table_name
    }
  }
}

resource "aws_lambda_alias" "search_summaries_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.search_summaries_function.function_name
  function_version = aws_lambda_function.search_summaries_function.version
}

# Process Transcription Function
resource "aws_lambda_function" "process_transcription_function" {
  function_name    = "ProcessTranscriptionFunction"
  description      = "Lambda function that handles language detection and transcription initiation."
  filename         = "${path.module}/../../../functions/zipped/ProcessTranscriptionFunction.zip"
  role             = var.iam_roles.lambda_function_transcription_role
  handler          = "ProcessTranscriptionFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/ProcessTranscriptionFunction.zip")
  publish = true

  environment {
    variables = {
      STORAGE_BUCKET = var.storage_bucket
    }
  }
}

resource "aws_lambda_alias" "process_transcription_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.process_transcription_function.function_name
  function_version = aws_lambda_function.process_transcription_function.version
}

# Get Transcription Results Function
resource "aws_lambda_function" "get_transcription_results_function" {
  function_name    = "GetTranscriptionResultsFunction"
  description      = "Lambda function that checks transcription job status and processes results."
  filename         = "${path.module}/../../../functions/zipped/GetTranscriptionResultsFunction.zip"
  role             = var.iam_roles.lambda_function_transcription_role
  handler          = "GetTranscriptionResultsFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/GetTranscriptionResultsFunction.zip")
  publish = true

  environment {
    variables = {
      STORAGE_BUCKET = var.storage_bucket
    }
  }
}

resource "aws_lambda_alias" "get_transcription_results_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.get_transcription_results_function.function_name
  function_version = aws_lambda_function.get_transcription_results_function.version
}

# Summarize Meeting Function
resource "aws_lambda_function" "summarize_meeting_function" {
  function_name    = "SummarizeMeetingFunction"
  description      = "Lambda function that summarizes transcriptions and stores results."
  filename         = "${path.module}/../../../functions/zipped/SummarizeMeetingFunction.zip"
  role             = var.iam_roles.bedrock_invoke_model_role
  handler          = "SummarizeMeetingFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/SummarizeMeetingFunction.zip")
  publish = true

  environment {
    variables = {
      STORAGE_BUCKET = var.storage_bucket
      MODEL_ID = var.model_id
      REGION = var.aws_region
      INFERENCE_PROFILE_PREFIX = var.inference_profile_prefix
    }
  }
}

resource "aws_lambda_alias" "summarize_meeting_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.summarize_meeting_function.function_name
  function_version = aws_lambda_function.summarize_meeting_function.version
}

# Extract Meeting Statistics Function
resource "aws_lambda_function" "extract_meeting_statistics_function" {
  function_name    = "ExtractMeetingStatisticsFunction"
  description      = "Lambda function that extracts statistics from meeting transcripts."
  filename         = "${path.module}/../../../functions/zipped/ExtractMeetingStatisticsFunction.zip"
  role             = var.iam_roles.meeting_statistics_role
  handler          = "ExtractMeetingStatisticsFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/ExtractMeetingStatisticsFunction.zip")
  publish = true

  environment {
    variables = {
      DYNAMODB_TABLE = var.meeting_statistics_table_name
      STORAGE_BUCKET = var.storage_bucket
    }
  }
}

resource "aws_lambda_alias" "extract_meeting_statistics_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.extract_meeting_statistics_function.function_name
  function_version = aws_lambda_function.extract_meeting_statistics_function.version
}

# Delete Summaries Function
resource "aws_lambda_function" "delete_summaries_function" {
  function_name    = "DeleteSummariesFunction"
  description      = "Lambda function that deletes meeting summaries."
  filename         = "${path.module}/../../../functions/zipped/DeleteSummariesFunction.zip"
  role             = var.iam_roles.meeting_summary_delete_role
  handler          = "DeleteSummariesFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/DeleteSummariesFunction.zip")
  publish = true

  environment {
    variables = {
      DYNAMODB_TABLE = var.meeting_summaries_table_name
      STORAGE_BUCKET = var.storage_bucket
    }
  }
}

resource "aws_lambda_alias" "delete_summaries_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.delete_summaries_function.function_name
  function_version = aws_lambda_function.delete_summaries_function.version
}

# Store Summary In Database Function
resource "aws_lambda_function" "store_summary_in_database_function" {
  function_name    = "StoreSummaryInDatabaseFunction"
  description      = "Lambda function that processes summaries and stores them in DynamoDB."
  filename         = "${path.module}/../../../functions/zipped/StoreSummaryInDatabaseFunction.zip"
  role             = var.iam_roles.process_summary_to_dynamodb_role
  handler          = "StoreSummaryInDatabaseFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/StoreSummaryInDatabaseFunction.zip")
  publish = true

  environment {
    variables = {
      SUMMARIES_TABLE = var.meeting_summaries_table_name,
      STATISTICS_TABLE = var.meeting_statistics_table_name
    }
  }
}

resource "aws_lambda_alias" "store_summary_in_database_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.store_summary_in_database_function.function_name
  function_version = aws_lambda_function.store_summary_in_database_function.version
}

# Store Summary In S3 Function
resource "aws_lambda_function" "store_summary_in_s3_function" {
  function_name    = "StoreSummaryInS3Function"
  description      = "Lambda function that stores meeting summaries in S3."
  filename         = "${path.module}/../../../functions/zipped/StoreSummaryInS3Function.zip"
  role             = var.iam_roles.process_summary_to_dynamodb_role
  handler          = "StoreSummaryInS3Function.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/StoreSummaryInS3Function.zip")
  publish = true

  environment {
    variables = {
      STORAGE_BUCKET = var.storage_bucket
    }
  }
}

resource "aws_lambda_alias" "store_summary_in_s3_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.store_summary_in_s3_function.function_name
  function_version = aws_lambda_function.store_summary_in_s3_function.version
}

# Get Processing Status Function
resource "aws_lambda_function" "get_processing_status_function" {
  function_name    = "GetProcessingStatusFunction"
  description      = "Lambda function that retrieves processing status for files."
  filename         = "${path.module}/../../../functions/zipped/GetProcessingStatusFunction.zip"
  role             = var.iam_roles.meeting_summary_search_role
  handler          = "GetProcessingStatusFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 30
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/GetProcessingStatusFunction.zip")
  publish = true

  environment {
    variables = {
      PROCESSING_STATUS_TABLE_NAME = var.processing_status_table_name
    }
  }
}

resource "aws_lambda_alias" "get_processing_status_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.get_processing_status_function.function_name
  function_version = aws_lambda_function.get_processing_status_function.version
}

# Update Processing Status Function
resource "aws_lambda_function" "update_processing_status_function" {
  function_name    = "UpdateProcessingStatusFunction"
  description      = "Lambda function that updates processing status for files."
  filename         = "${path.module}/../../../functions/zipped/UpdateProcessingStatusFunction.zip"
  role             = var.iam_roles.process_summary_to_dynamodb_role
  handler          = "UpdateProcessingStatusFunction.lambda_handler"
  runtime          = "python3.12"
  timeout          = 30
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/UpdateProcessingStatusFunction.zip")
  publish = true

  environment {
    variables = {
      PROCESSING_STATUS_TABLE_NAME = var.processing_status_table_name
    }
  }
}

resource "aws_lambda_alias" "update_processing_status_function_alias" {
  name             = "latest"
  function_name    = aws_lambda_function.update_processing_status_function.function_name
  function_version = aws_lambda_function.update_processing_status_function.version
}
