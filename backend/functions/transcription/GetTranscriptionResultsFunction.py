import json
import boto3
import logging
import os
from urllib.parse import urlparse

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    transcribe = boto3.client('transcribe')
    
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Get the transcription job name from the event
        job_name = event.get('TranscriptionJobName')
        
        if not job_name:
            return {
                'statusCode': 400,
                'body': {
                    'status': 'ERROR',
                    'message': "Missing required parameter: 'TranscriptionJobName'"
                }
            }
        
        # Get the transcription job details
        logger.info(f"Getting transcription job details for: {job_name}")
        response = transcribe.get_transcription_job(
            TranscriptionJobName=job_name
        )
        
        # Extract the job status
        job_status = response['TranscriptionJob']['TranscriptionJobStatus']
        logger.info(f"Transcription job status: {job_status}")
        
        # Prepare the response
        result = {
            'TranscriptionJobName': job_name,
            'status': job_status
        }
        
        # If the job is complete, include the transcript URI and key
        if job_status == 'COMPLETED':
            transcript_uri = response['TranscriptionJob']['Transcript']['TranscriptFileUri']
            logger.info(f"Transcription job completed. Transcript URI: {transcript_uri}")
            result['transcriptUri'] = transcript_uri
            
            # Extract the key from the URI
            # For S3 URIs like s3://bucket/key
            if transcript_uri.startswith('s3://'):
                parts = transcript_uri[5:].split('/', 1)
                if len(parts) > 1:
                    result['key'] = parts[1]
            # For HTTPS URIs like https://s3.region.amazonaws.com/bucket/key
            elif transcript_uri.startswith('https://'):
                parsed_url = urlparse(transcript_uri)
                path_parts = parsed_url.path.lstrip('/').split('/', 1)
                if len(path_parts) > 1:
                    result['key'] = path_parts[1]
            
            # If we couldn't extract the key, use a default based on the job name
            if 'key' not in result:
                result['key'] = f"transcribed-conversations/{job_name}.json"
        
        # Return the result with a statusCode and body wrapper
        return {
            'statusCode': 200,
            'body': result
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error: {error_msg}")
        return {
            'statusCode': 500,
            'body': {
                'status': 'ERROR',
                'message': error_msg
            }
        }
