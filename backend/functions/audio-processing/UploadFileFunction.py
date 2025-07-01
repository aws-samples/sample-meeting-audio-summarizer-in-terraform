import json
import boto3
import os
import uuid
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3 = boto3.client('s3')
lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    """
    Lambda function to handle file uploads to S3.
    Generates a pre-signed URL for direct upload from the client.
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Get the bucket name from environment variables
        bucket_name = os.environ.get('STORAGE_BUCKET')
        if not bucket_name:
            return {
                "error": "Bucket name not configured"
            }
        
        # Parse the request
        if 'arguments' in event:
            # Handle AppSync invocation
            arguments = event['arguments']
            filename = arguments.get('filename')
            content_type = arguments.get('contentType', 'application/octet-stream')
            local_timestamp = arguments.get('localTimestamp')
        else:
            # Handle direct invocation
            filename = event.get('filename')
            content_type = event.get('contentType', 'application/octet-stream')
            local_timestamp = event.get('localTimestamp')
        
        if not filename:
            return {
                "error": "Missing filename in request"
            }
        
        # Extract user ID from context (AppSync provides this)
        user_id = None
        
        # Try multiple ways to get user ID from AppSync context
        try:
            # First try event.identity (AppSync passes user info here)
            if 'identity' in event and event['identity']:
                identity = event['identity']
                logger.info(f"Event identity: {identity}")
                
                # Try different user ID fields
                if isinstance(identity, dict):
                    user_id = (identity.get('sub') or 
                              identity.get('username') or 
                              identity.get('cognito:username') or
                              identity.get('userId'))
                    logger.info(f"Got user ID from event.identity: {user_id}")
                
            # Fallback to context.identity
            elif hasattr(context, 'identity') and context.identity:
                if hasattr(context.identity, 'cognito_identity_id'):
                    user_id = context.identity.cognito_identity_id
                    logger.info(f"Got user ID from context.identity.cognito_identity_id: {user_id}")
                elif hasattr(context.identity, 'sub'):
                    user_id = context.identity.sub
                    logger.info(f"Got user ID from context.identity.sub: {user_id}")
                    
        except Exception as e:
            logger.error(f"Error extracting user ID: {str(e)}")
        
        if not user_id:
            logger.warning("Could not extract user ID from context or event")
            logger.info(f"Event identity content: {event.get('identity', 'No identity in event')}")
            # For now, let's use a placeholder to test the flow
            user_id = "test-user-id"
            logger.info(f"Using placeholder user ID for testing: {user_id}")
        else:
            logger.info(f"Successfully extracted user ID: {user_id}")
        
        # Generate a unique file ID and key
        file_id = str(uuid.uuid4())
        timestamp = local_timestamp or datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        file_extension = filename.split('.')[-1] if '.' in filename else 'mp3'
        
        # Upload to audio/{user_id}/ for better multi-user support
        if user_id:
            file_key = f"audio/{user_id}/{timestamp}_{file_id}.{file_extension}"
        else:
            # Fallback if no user ID (shouldn't happen in normal flow)
            file_key = f"audio/anonymous/{timestamp}_{file_id}.{file_extension}"
        
        # Create metadata with local timestamp
        metadata = {
            'filename': filename,
            'contentType': content_type,
            'uploadTime': datetime.utcnow().isoformat(),
            'localTimestamp': local_timestamp,
            'fileId': file_id,
            'userId': user_id
        }
        
        # Save metadata to S3
        if local_timestamp:
            metadata_key = f"{file_key}-metadata.json"
            s3.put_object(
                Bucket=bucket_name,
                Key=metadata_key,
                Body=json.dumps(metadata),
                ContentType='application/json'
            )
            logger.info(f"Saved metadata with local timestamp to {metadata_key}")
        
        # Generate a pre-signed URL for uploading
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': file_key,
                'ContentType': content_type
            },
            ExpiresIn=3600  # URL expires in 1 hour
        )
        
        logger.info(f"Generated pre-signed URL for {file_key}")
        
        # Create initial processing status if user is authenticated
        if user_id:
            try:
                # Get the function name from environment or use default
                update_function_name = os.environ.get('UPDATE_PROCESSING_STATUS_FUNCTION_NAME', 'UpdateProcessingStatusFunction')
                
                response = lambda_client.invoke(
                    FunctionName=update_function_name,
                    InvocationType='Event',  # Async invocation
                    Payload=json.dumps({
                        'file_id': file_id,
                        'user_id': user_id,
                        'status': 'UPLOADED',
                        'file_name': filename
                    })
                )
                logger.info(f"Successfully invoked {update_function_name} for file {file_id}. Response: {response}")
            except Exception as e:
                logger.error(f"Failed to create processing status for file {file_id}: {str(e)}")
                # Don't fail the upload if status creation fails, but log the error
                logger.error(f"Error details: {type(e).__name__}: {str(e)}")
        else:
            logger.warning("User ID not found, skipping processing status creation")
        
        # Return the pre-signed URL to the client
        return {
            "uploadUrl": presigned_url,
            "fileKey": file_key,
            "fileId": file_id
        }
        
    except Exception as e:
        logger.error(f"Error generating pre-signed URL: {str(e)}")
        return {
            "error": f"Failed to process request: {str(e)}"
        }
