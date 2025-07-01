#!/bin/bash

# Script to zip Lambda functions for deployment
# Updated with new function names using verb-first naming convention

# Set the base directory to the project root (one level up from scripts)
BASE_DIR="$(dirname "$(pwd)")"
FUNCTIONS_DIR="${BASE_DIR}/backend/functions"
ZIPPED_DIR="${FUNCTIONS_DIR}/zipped"

# Create the zipped directory if it doesn't exist
mkdir -p "${ZIPPED_DIR}"

# Function to zip a Lambda function
zip_function() {
  local dir=$1
  local function_name=$2
  echo "==== ${function_name} ===="
  echo "Zipping ${function_name}..."
  
  # Check if the directory exists
  if [ ! -d "${FUNCTIONS_DIR}/${dir}" ]; then
    echo "❌ Directory ${FUNCTIONS_DIR}/${dir} does not exist, skipping ${function_name}"
    return 1
  fi
  
  # Check if the function file exists
  if [ ! -f "${FUNCTIONS_DIR}/${dir}/${function_name}.py" ]; then
    echo "❌ File ${FUNCTIONS_DIR}/${dir}/${function_name}.py does not exist, skipping"
    return 1
  fi
  
  cd "${FUNCTIONS_DIR}/${dir}"
  zip -r "${ZIPPED_DIR}/${function_name}.zip" "${function_name}.py"

  if [ $? -eq 0 ]; then
    echo "✅ Successfully zipped ${function_name}"
    echo ""
  else
    echo "❌ Failed to zip ${function_name}"
    echo ""
  fi
}

# Clean up old zip files
echo "Cleaning up old zip files..."
rm -f "${ZIPPED_DIR}"/*.zip

# Audio Processing Functions
zip_function "audio-processing" "ProcessTranscriptionFunction"
zip_function "audio-processing" "UploadFileFunction"

# Authentication Functions
zip_function "authentication" "CognitoPostConfirmationTrigger"

# Transcription Functions
zip_function "transcription" "GetTranscriptionResultsFunction"

# Data Access Functions
zip_function "data-access" "DeleteSummariesFunction"
zip_function "data-access" "ExtractMeetingStatisticsFunction"
zip_function "data-access" "GetStatisticsFunction"
zip_function "data-access" "GetSummariesFunction"
zip_function "data-access" "SearchSummariesFunction"
zip_function "data-access" "GetProcessingStatusFunction"
zip_function "data-access" "UpdateProcessingStatusFunction"

# Queue Processing Function
zip_function "queue-processing" "ProcessTranscriptionQueueFunction"

# Summarization Functions
zip_function "summarization" "SummarizeMeetingFunction"
zip_function "summarization" "StoreSummaryInDatabaseFunction"
zip_function "summarization" "StoreSummaryInS3Function"

echo "All Lambda functions have been zipped successfully!"
