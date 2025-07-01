resource "aws_sfn_state_machine" "audio_transcription_workflow" {
  name     = "AudioTranscriptionWorkflow"
  role_arn = var.iam_roles.step_functions_role

  definition = <<EOF
  {
    "Comment": "Audio Transcription Workflow",
    "StartAt": "UpdateStatusToTranscribing",
    "States": {
      "UpdateStatusToTranscribing": {
        "Type": "Task",
        "Resource": "${var.lambda_functions.update_processing_status_function_arn}",
        "Parameters": {
          "file_id.$": "$.fileId",
          "user_id.$": "$.userId",
          "status": "TRANSCRIBING",
          "stage": "Starting transcription",
          "progress_percentage": 20
        },
        "ResultPath": "$.statusUpdate1",
        "Next": "ProcessAudioAndTranscribe",
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "ResultPath": "$.statusUpdateError",
            "Next": "ProcessAudioAndTranscribe"
          }
        ]
      },
      "ProcessAudioAndTranscribe": {
        "Type": "Task",
        "Resource": "${var.lambda_functions.process_transcription_function_arn}",
        "Parameters": {
          "bucket.$": "$.bucket",
          "file.$": "$.file",
          "inputFile.$": "$.inputFile"
        },
        "ResultPath": "$.transcriptionJob",
        "Next": "ConfigureTranscription",
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "Next": "UpdateStatusToFailed"
          }
        ]
      },
      "ConfigureTranscription": {
        "Type": "Choice",
        "Choices": [
          {
            "Variable": "$.transcriptionJob.statusCode",
            "NumericEquals": 200,
            "Next": "SetTranscriptionParameters"
          }
        ],
        "Default": "UpdateStatusToFailed"
      },
      "SetTranscriptionParameters": {
        "Type": "Pass",
        "Parameters": {
          "TranscriptionJobName.$": "$.transcriptionJob.TranscriptionJobName",
          "status.$": "$.transcriptionJob.body.status",
          "inputFile.$": "$.inputFile",
          "outputLocation.$": "$.transcriptionJob.body.outputLocation",
          "bucket.$": "$.bucket",
          "languageCode": "en-US",
          "fileId.$": "$.fileId",
          "userId.$": "$.userId"
        },
        "Next": "PollTranscriptionStatus"
      },
      "PollTranscriptionStatus": {
        "Type": "Task",
        "Resource": "${var.lambda_functions.get_transcription_results_function_arn}",
        "Parameters": {
          "TranscriptionJobName.$": "$.TranscriptionJobName"
        },
        "ResultPath": "$.transcriptionJobStatus",
        "Next": "CheckCompletion",
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "Next": "UpdateStatusToFailed"
          }
        ]
      },
      "CheckCompletion": {
        "Type": "Choice",
        "Choices": [
          {
            "And": [
              {
                "Variable": "$.transcriptionJobStatus.statusCode",
                "NumericEquals": 200
              },
              {
                "Variable": "$.transcriptionJobStatus.body.status",
                "StringEquals": "COMPLETED"
              }
            ],
            "Next": "UpdateStatusToTranscriptionComplete"
          },
          {
            "Variable": "$.transcriptionJobStatus.body.status",
            "StringEquals": "FAILED",
            "Next": "UpdateStatusToFailed"
          },
          {
            "Variable": "$.transcriptionJobStatus.body.status",
            "StringEquals": "ERROR",
            "Next": "UpdateStatusToFailed"
          }
        ],
        "Default": "WaitBeforePolling"
      },
      "WaitBeforePolling": {
        "Type": "Wait",
        "Seconds": 30,
        "Next": "PollTranscriptionStatus"
      },
      "UpdateStatusToTranscriptionComplete": {
        "Type": "Task",
        "Resource": "${var.lambda_functions.update_processing_status_function_arn}",
        "Parameters": {
          "file_id.$": "$.fileId",
          "user_id.$": "$.userId",
          "status": "TRANSCRIPTION_COMPLETE",
          "stage": "Transcription completed, processing transcript",
          "progress_percentage": 60
        },
        "ResultPath": "$.statusUpdate2",
        "Next": "ProcessTranscription",
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "ResultPath": "$.statusUpdateError",
            "Next": "ProcessTranscription"
          }
        ]
      },
      "ProcessTranscription": {
        "Type": "Task",
        "Resource": "${var.lambda_functions.process_transcription_function_arn}",
        "Parameters": {
          "TranscriptionJobName.$": "$.TranscriptionJobName",
          "transcriptUri.$": "$.transcriptionJobStatus.body.transcriptUri",
          "bucket.$": "$.bucket",
          "inputFile.$": "$.inputFile"
        },
        "ResultPath": "$.processedTranscript",
        "Next": "UpdateStatusToSummarizing",
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "Next": "UpdateStatusToFailed"
          }
        ]
      },
      "UpdateStatusToSummarizing": {
        "Type": "Task",
        "Resource": "${var.lambda_functions.update_processing_status_function_arn}",
        "Parameters": {
          "file_id.$": "$.fileId",
          "user_id.$": "$.userId",
          "status": "SUMMARIZING",
          "stage": "Generating summary and statistics",
          "progress_percentage": 80
        },
        "ResultPath": "$.statusUpdate3",
        "Next": "ParallelProcessing",
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "ResultPath": "$.statusUpdateError",
            "Next": "ParallelProcessing"
          }
        ]
      },
      "ParallelProcessing": {
        "Type": "Parallel",
        "Branches": [
          {
            "StartAt": "GenerateSummary",
            "States": {
              "GenerateSummary": {
                "Type": "Task",
                "Resource": "${var.lambda_functions.summarize_meeting_function_arn}",
                "Parameters": {
                  "TranscriptionJobName.$": "$.TranscriptionJobName",
                  "transcriptUri.$": "$.transcriptionJobStatus.body.transcriptUri",
                  "bucket.$": "$.bucket",
                  "transcriptKey.$": "$.processedTranscript.body.key"
                },
                "Catch": [
                  {
                    "ErrorEquals": ["States.ALL"],
                    "ResultPath": "$.error",
                    "Next": "SummaryFallback"
                  }
                ],
                "Next": "SummaryFallback"
              },
              "SummaryFallback": {
                "Type": "Pass",
                "End": true
              }
            }
          },
          {
            "StartAt": "CollectStatistics",
            "States": {
              "CollectStatistics": {
                "Type": "Task",
                "Resource": "${var.lambda_functions.extract_meeting_statistics_function_arn}",
                "Parameters": {
                  "TranscriptionJobName.$": "$.TranscriptionJobName",
                  "transcriptUri.$": "$.transcriptionJobStatus.body.transcriptUri",
                  "bucket.$": "$.bucket",
                  "inputFile.$": "$.inputFile"
                },
                "Catch": [
                  {
                    "ErrorEquals": ["States.ALL"],
                    "ResultPath": "$.error",
                    "Next": "StatisticsFallback"
                  }
                ],
                "Next": "StatisticsFallback"
              },
              "StatisticsFallback": {
                "Type": "Pass",
                "End": true
              }
            }
          }
        ],
        "ResultPath": "$.parallelResults",
        "Next": "UpdateStatusToComplete",
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "Next": "UpdateStatusToFailed"
          }
        ]
      },
      "UpdateStatusToComplete": {
        "Type": "Task",
        "Resource": "${var.lambda_functions.update_processing_status_function_arn}",
        "Parameters": {
          "file_id.$": "$.fileId",
          "user_id.$": "$.userId",
          "status": "COMPLETE",
          "stage": "Processing completed successfully",
          "progress_percentage": 100
        },
        "ResultPath": "$.statusUpdate4",
        "Next": "CompleteWorkflow",
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "ResultPath": "$.statusUpdateError",
            "Next": "CompleteWorkflow"
          }
        ]
      },
      "UpdateStatusToFailed": {
        "Type": "Task",
        "Resource": "${var.lambda_functions.update_processing_status_function_arn}",
        "Parameters": {
          "file_id.$": "$.fileId",
          "user_id.$": "$.userId",
          "status": "FAILED",
          "stage": "Processing failed",
          "progress_percentage": 0
        },
        "ResultPath": "$.statusUpdateFailed",
        "Next": "TerminateWorkflow",
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "ResultPath": "$.statusUpdateError",
            "Next": "TerminateWorkflow"
          }
        ]
      },
      "CompleteWorkflow": {
        "Type": "Succeed"
      },
      "TerminateWorkflow": {
        "Type": "Fail",
        "Cause": "Workflow Failed",
        "Error": "WorkflowError"
      }
    }
  }
EOF
}

# Daily statistics processing rule
resource "aws_cloudwatch_event_rule" "daily_statistics_rule" {
  name                = "daily-statistics-processing"
  description         = "Process statistics daily"
  schedule_expression = "cron(0 0 * * ? *)"
}

resource "aws_cloudwatch_event_target" "daily_statistics_target" {
  rule      = aws_cloudwatch_event_rule.daily_statistics_rule.name
  target_id = "ProcessDailyStatistics"
  arn       = var.lambda_functions["get_statistics_function_arn"]
}

resource "aws_lambda_permission" "allow_eventbridge_statistics" {
  statement_id  = "AllowExecutionFromEventBridgeStatistics"
  action        = "lambda:InvokeFunction"
  function_name = element(split(":", var.lambda_functions["get_statistics_function_arn"]), length(split(":", var.lambda_functions["get_statistics_function_arn"])) - 1)
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_statistics_rule.arn
}
