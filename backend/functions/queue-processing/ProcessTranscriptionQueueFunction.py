import json
import os
import boto3
import logging
import urllib.parse
import uuid
from datetime import datetime
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# File size thresholds in bytes
SMALL_FILE_THRESHOLD = 5 * 1024 * 1024  # 5 MB
MEDIUM_FILE_THRESHOLD = 20 * 1024 * 1024  # 20 MB
LARGE_FILE_THRESHOLD = 50 * 1024 * 1024  # 50 MB

# Concurrency settings based on file size - more conservative limits
CONCURRENCY_SETTINGS = {
    "small": 3,    # Small files (< 5 MB): 3 concurrent jobs
    "medium": 2,   # Medium files (5-20 MB): 2 concurrent jobs
    "large": 1,    # Large files (20-50 MB): 1 concurrent job
    "very_large": 1  # Very large files (> 50 MB): 1 concurrent job
}

# Global maximum concurrency regardless of file size
GLOBAL_MAX_CONCURRENCY = 5  # Never exceed this many concurrent jobs total

def get_file_size(bucket, key):
    """
    Get the size of a file in S3
    """
    try:
        s3_client = boto3.client('s3')
        response = s3_client.head_object(Bucket=bucket, Key=key)
        return response['ContentLength']
    except Exception as e:
        logger.error(f"Error getting file size for {bucket}/{key}: {str(e)}")
        # Default to medium if we can't determine size
        return MEDIUM_FILE_THRESHOLD

def determine_concurrency_limit(file_size):
    """
    Determine the appropriate concurrency limit based on file size
    """
    if file_size < SMALL_FILE_THRESHOLD:
        return CONCURRENCY_SETTINGS["small"]
    elif file_size < MEDIUM_FILE_THRESHOLD:
        return CONCURRENCY_SETTINGS["medium"]
    elif file_size < LARGE_FILE_THRESHOLD:
        return CONCURRENCY_SETTINGS["large"]
    else:
        return CONCURRENCY_SETTINGS["very_large"]

def create_initial_processing_status(file_id, user_id, file_name):
    """
    Create initial processing status entry in DynamoDB
    """
    try:
        dynamodb = boto3.resource('dynamodb')
        table_name = os.getenv('PROCESSING_STATUS_TABLE', 'meeting-audio-summarizer-processing-status-prod')
        table = dynamodb.Table(table_name)
        
        current_time = datetime.utcnow().isoformat()
        
        # Create initial processing status entry
        table.put_item(
            Item={
                'file_id': file_id,
                'user_id': user_id,
                'status': 'UPLOADED',
                'stage': 'File uploaded successfully',
                'progress_percentage': 10,
                'file_name': file_name,
                'created_at': current_time,
                'updated_at': current_time
            }
        )
        
        logger.info(f"Created initial processing status for fileId: {file_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to create initial processing status: {str(e)}")
        return False

def lambda_handler(event, context):
    """
    Process messages from SQS queue and start state machine executions
    with dynamic rate limiting based on file size and global concurrency
    """
    logger.info(f"Event received: {json.dumps(event)}")
    
    # Get the state machine ARN from environment variables
    state_machine_arn = os.getenv("STATE_MACHINE_ARN")
    if not state_machine_arn:
        logger.error("STATE_MACHINE_ARN environment variable not set")
        raise Exception("STATE_MACHINE_ARN environment variable not set")
    
    # Default max concurrent jobs from environment (fallback)
    default_max_concurrent_jobs = int(os.getenv("MAX_CONCURRENT_JOBS", "3"))
    
    # We should only have one record since batch size is set to 1
    if len(event["Records"]) > 0:
        record = event["Records"][0]
        try:
            # Log the raw record for debugging
            logger.info(f"Raw SQS record: {json.dumps(record)}")
            
            # Parse the message body
            try:
                message_body = json.loads(record["body"])
                logger.info(f"Successfully parsed JSON message body")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse message body as JSON: {str(e)}")
                logger.info(f"Raw message body: {record['body']}")
                # Try to handle it as a string
                message_body = {"raw_content": record["body"]}
            
            logger.info(f"Message body structure: {json.dumps(message_body)}")
            
            # Extract bucket and key from the message - handle S3 event format
            bucket = None
            key = None
            
            # Check if this is an S3 event notification
            if "Records" in message_body:
                logger.info(f"Found Records array in message body with {len(message_body['Records'])} records")
                
                for s3_record in message_body["Records"]:
                    logger.info(f"Processing record: {json.dumps(s3_record)}")
                    
                    if s3_record.get("eventSource") == "aws:s3":
                        logger.info("Found S3 event source")
                        
                        if "s3" in s3_record:
                            s3_event = s3_record["s3"]
                            logger.info(f"S3 event data: {json.dumps(s3_event)}")
                            
                            if "bucket" in s3_event and "name" in s3_event["bucket"]:
                                bucket = s3_event["bucket"]["name"]
                                logger.info(f"Extracted bucket name: {bucket}")
                            else:
                                logger.error("Missing bucket name in S3 event")
                            
                            if "object" in s3_event and "key" in s3_event["object"]:
                                key = urllib.parse.unquote_plus(s3_event["object"]["key"])
                                logger.info(f"Extracted object key: {key}")
                            else:
                                logger.error("Missing object key in S3 event")
                        else:
                            logger.error("Missing s3 data in event record")
                    else:
                        logger.info(f"Record is not an S3 event. Event source: {s3_record.get('eventSource', 'not specified')}")
            else:
                # Use the message body as-is (for backward compatibility)
                logger.info("No Records found in message body, trying direct fields")
                bucket = message_body.get("bucket")
                logger.info(f"Direct bucket field: {bucket}")
                
                key = message_body.get("file") or message_body.get("inputFile")
                logger.info(f"Direct key field (file or inputFile): {key}")
                
                # Try to extract from raw content if it's a string that might contain the info
                if not bucket or not key:
                    raw_content = message_body.get("raw_content", "")
                    logger.info(f"Trying to extract from raw content: {raw_content}")
                    
                    # Simple pattern matching for bucket and key
                    if "bucket" in raw_content and "key" in raw_content:
                        logger.info("Found bucket and key in raw content, attempting extraction")
                        # This is a very basic extraction attempt
                        try:
                            import re
                            bucket_match = re.search(r'"bucket":\s*{\s*"name":\s*"([^"]+)"', raw_content)
                            key_match = re.search(r'"key":\s*"([^"]+)"', raw_content)
                            
                            if bucket_match:
                                bucket = bucket_match.group(1)
                                logger.info(f"Extracted bucket from raw content: {bucket}")
                            
                            if key_match:
                                key = urllib.parse.unquote_plus(key_match.group(1))
                                logger.info(f"Extracted key from raw content: {key}")
                        except Exception as extract_error:
                            logger.error(f"Error extracting from raw content: {str(extract_error)}")
            
            if not bucket or not key:
                logger.error("Missing bucket or key in message body after all extraction attempts")
                raise Exception("Missing bucket or key in message body")
            
            # Process audio files with new path structure: audio/{user_id}/filename
            # Also handle legacy audio/meetinguser/ and summaries/ prefixes
            if key.startswith('audio/') and not key.endswith('/'):
                # For audio files, start the transcription workflow
                logger.info(f"Processing audio file: {key}")
                
                # Get file size and determine concurrency limit
                file_size = get_file_size(bucket, key)
                file_size_based_limit = determine_concurrency_limit(file_size)
                
                file_size_mb = file_size / (1024 * 1024)
                logger.info(f"File size: {file_size_mb:.2f} MB, File-size based concurrency limit: {file_size_based_limit}")
                
                # Check current number of transcription jobs
                transcribe_client = boto3.client("transcribe")
                response = transcribe_client.list_transcription_jobs(
                    Status="IN_PROGRESS"
                )
                current_jobs = len(response["TranscriptionJobSummaries"])
                
                # Apply both file-size based limit and global limit
                effective_limit = min(file_size_based_limit, GLOBAL_MAX_CONCURRENCY)
                logger.info(f"Current transcription jobs: {current_jobs} of {effective_limit} maximum (Global max: {GLOBAL_MAX_CONCURRENCY})")
                
                # If we're at capacity based on the effective limit, don't process the message
                if current_jobs >= effective_limit:
                    logger.info(f"At capacity ({current_jobs}/{effective_limit} jobs). Not processing message.")
                    # Intentionally throw an exception to prevent message deletion
                    raise Exception(f"At transcription job capacity for file size {file_size_mb:.2f} MB - message will be retried later")
                
                # Extract fileId and userId from the file path
                # File format: audio/{user_id}/timestamp_fileId.extension
                path_parts = key.split('/')
                if len(path_parts) >= 3 and path_parts[0] == 'audio':
                    user_id = path_parts[1]  # Extract user_id from path
                    filename = path_parts[-1]  # Get just the filename
                    
                    if '_' in filename:
                        # Extract fileId from timestamp_fileId.extension
                        file_parts = filename.split('_')
                        if len(file_parts) >= 2:
                            file_id_with_ext = '_'.join(file_parts[1:])  # Handle multiple underscores
                            file_id = file_id_with_ext.split('.')[0]  # Remove extension
                            logger.info(f"Extracted fileId: {file_id} and userId: {user_id} from path: {key}")
                        else:
                            file_id = filename.split('.')[0]  # Fallback: use filename without extension
                            logger.warning(f"Could not extract fileId from filename format, using: {file_id}")
                    else:
                        file_id = filename.split('.')[0]  # Fallback: use filename without extension
                        logger.warning(f"Filename doesn't contain underscore, using: {file_id}")
                else:
                    # Fallback for unexpected path format
                    user_id = "unknown"
                    filename = key.split('/')[-1]
                    file_id = filename.split('.')[0]
                    logger.warning(f"Unexpected path format: {key}, using fallback userId: {user_id}, fileId: {file_id}")
                
                # Generate a unique execution name
                execution_name = f"Execution-{context.aws_request_id}-{record['messageId']}"
                
                # Create initial processing status entry
                filename = key.split('/')[-1]
                create_initial_processing_status(file_id, user_id, filename)
                
                # Start the state machine execution
                sfn_client = boto3.client("stepfunctions")
                response = sfn_client.start_execution(
                    stateMachineArn=state_machine_arn,
                    input=json.dumps({
                        "inputFile": key, 
                        "file": key, 
                        "bucket": bucket,
                        "fileId": file_id,
                        "userId": user_id
                    }),
                    name=execution_name[:80]  # Limit name to 80 characters
                )
                
                logger.info(f"State machine execution started: {response['executionArn']}")
                
                return {
                    "statusCode": 200,
                    "body": json.dumps({
                        "messageId": record["messageId"],
                        "executionArn": response["executionArn"],
                        "fileSize": f"{file_size_mb:.2f} MB",
                        "concurrencyLimit": effective_limit,
                        "status": "SUCCESS"
                    })
                }
            
            elif key.startswith('summaries/'):
                # For summary files, process them directly
                logger.info(f"Processing summary file: {key}")
                
                # Generate a unique execution name
                execution_name = f"Summary-{context.aws_request_id}-{record['messageId']}"
                
                # Start the state machine execution at the appropriate step
                sfn_client = boto3.client("stepfunctions")
                response = sfn_client.start_execution(
                    stateMachineArn=state_machine_arn,
                    input=json.dumps({
                        "summaryFile": key,
                        "bucket": bucket,
                        "skipTranscription": True  # Flag to skip transcription steps
                    }),
                    name=execution_name[:80]  # Limit name to 80 characters
                )
                
                logger.info(f"Summary processing started: {response['executionArn']}")
                
                return {
                    "statusCode": 200,
                    "body": json.dumps({
                        "messageId": record["messageId"],
                        "executionArn": response["executionArn"],
                        "status": "SUCCESS"
                    })
                }
            
            else:
                # Skip files that don't match our prefixes
                logger.info(f"Skipping file with unsupported prefix: {key}")
                return {
                    "statusCode": 200,
                    "body": json.dumps({
                        "message": "Skipped file with unsupported prefix",
                        "key": key
                    })
                }
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            # Re-raise the exception to prevent message deletion
            # This ensures the message will be retried if there was a transient error
            raise e
    
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "No messages to process"})
    }
