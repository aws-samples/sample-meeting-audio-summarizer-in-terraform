import json
import boto3
import os
import logging
from datetime import datetime
from urllib.parse import unquote

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3 = boto3.client('s3')
transcribe = boto3.client('transcribe')

def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Check if this is the first invocation (starting transcription) or second (processing transcript)
        if 'transcriptUri' in event:
            # This is the second invocation - process the transcript
            return process_transcript(event)
        else:
            # This is the first invocation - start the transcription job
            return start_transcription_job(event)
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        return {
            "statusCode": 500,
            "body": {
                "error": f"Failed to process: {str(e)}"
            }
        }

def start_transcription_job(event):
    """Start a transcription job for the audio file"""
    try:
        # Get parameters from the event
        bucket = event.get('bucket')
        file_key = event.get('file')
        input_file = event.get('inputFile')
        
        # Use inputFile if file_key is not provided
        if not file_key and input_file:
            file_key = input_file
        
        if not bucket or not file_key:
            raise ValueError("Missing required parameters: bucket and file/inputFile")
        
        # Generate a unique job name - extract filename from path
        path_parts = file_key.split('/')
        filename = path_parts[-1]  # Get the actual filename
        base_file_name = filename.rsplit(".", 1)[0]
        sanitized_file_name = "".join(c if c.isalnum() else "-" for c in base_file_name)
        current_date = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        job_name = f"transcription-{sanitized_file_name}-{current_date}"[:200]
        
        # Validate file extension
        valid_formats = ["mp3", "mp4", "wav", "flac", "ogg", "m4a", "amr", "webm"]
        file_extension = file_key.split(".")[-1].lower()
        if file_extension not in valid_formats:
            raise ValueError(f"Invalid file format. Supported formats: {', '.join(valid_formats)}")
        
        # Construct the S3 URI
        s3_uri = f"s3://{bucket}/{file_key}"
        output_key = f"transcripts/{base_file_name}.json"
        
        # Map file extensions to MediaFormat values accepted by Amazon Transcribe
        format_mapping = {
            "mp3": "mp3",
            "mp4": "mp4",
            "wav": "wav",
            "flac": "flac",
            "ogg": "ogg",
            "m4a": "mp4",  # Amazon Transcribe treats m4a as mp4
            "amr": "amr",
            "webm": "webm"
        }
        
        media_format = format_mapping.get(file_extension, file_extension)
        
        # Start the transcription job
        logger.info(f"Starting transcription job: {job_name}")
        response = transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={"MediaFileUri": s3_uri},
            MediaFormat=media_format,
            LanguageCode="en-US",
            OutputBucketName=bucket,
            OutputKey=output_key,
            Settings={
                "ShowSpeakerLabels": True,
                "MaxSpeakerLabels": 10,
                "ShowAlternatives": True,
                "MaxAlternatives": 2,
                "VocabularyFilterMethod": "mask",
            },
        )
        
        # Create the result object with the TranscriptionJobName
        result = {
            "TranscriptionJobName": job_name,
            "status": response["TranscriptionJob"]["TranscriptionJobStatus"],
            "jobCreationTime": response["TranscriptionJob"]["CreationTime"].strftime(
                "%Y-%m-%d %H:%M:%S"
            ),
            "inputFile": file_key,
            "outputLocation": output_key,
            "mediaFormat": file_extension,
            "bucket": bucket,
            "transcriptUri": f"s3://{bucket}/{output_key}"
        }
        
        logger.info(f"Job started successfully: {json.dumps(result)}")
        
        return {
            "statusCode": 200,
            "body": result,
            "TranscriptionJobName": job_name  # Add this field at the top level for the state machine
        }
    except Exception as e:
        logger.error(f"Error starting transcription job: {str(e)}")
        return {
            "statusCode": 500,
            "body": {
                "error": f"Failed to start transcription job: {str(e)}"
            }
        }

def process_transcript(event):
    """Process the transcript after it's been generated"""
    try:
        # Get parameters from the event
        job_name = event.get('TranscriptionJobName')
        transcript_uri = event.get('transcriptUri')
        bucket_name = event.get('bucket')
        input_file = event.get('inputFile')
        
        if not job_name or not transcript_uri or not bucket_name:
            raise ValueError("Missing required parameters: TranscriptionJobName, transcriptUri, or bucket")
        
        # Parse the transcript URI to get the key
        if transcript_uri.startswith(f"s3://{bucket_name}/"):
            transcript_key = transcript_uri.replace(f"s3://{bucket_name}/", "")
        elif transcript_uri.startswith("https://s3."):
            # Handle HTTPS URLs from Transcribe
            # Format: https://s3.region.amazonaws.com/bucket-name/key
            if f"/{bucket_name}/" in transcript_uri:
                transcript_key = transcript_uri.split(f"/{bucket_name}/")[1]
                # URL decode the key to handle encoded characters like %3A (:)
                transcript_key = unquote(transcript_key)
            else:
                raise ValueError(f"Cannot parse transcript URI: {transcript_uri}")
        else:
            transcript_key = transcript_uri
            # URL decode in case it's already just a key with encoded characters
            transcript_key = unquote(transcript_key)
        
        logger.info(f"Getting transcript from bucket: {bucket_name}, key: {transcript_key}")
        logger.info(f"Original transcript URI: {transcript_uri}")
        logger.info(f"Decoded transcript key: {transcript_key}")
        
        # Get the transcript from S3
        response = s3.get_object(Bucket=bucket_name, Key=transcript_key)
        transcript_text = response['Body'].read().decode('utf-8')
        
        # Check if the transcript is in JSON format
        try:
            transcript_data = json.loads(transcript_text)
            is_json = True
        except json.JSONDecodeError:
            transcript_data = transcript_text
            is_json = False
        
        # Extract the base name from the job name
        base_name = job_name
        if job_name.startswith('transcription-'):
            base_name = job_name[13:]
            timestamp_index = base_name.find('-2025-')
            if timestamp_index > 0:
                base_name = base_name[:timestamp_index]
        
        # Remove any leading or trailing hyphens
        base_name = base_name.strip('-')
        
        # Process the transcript
        if is_json:
            # Extract the transcript text from the JSON
            if 'results' in transcript_data and 'transcripts' in transcript_data['results']:
                full_text = ' '.join([item['transcript'] for item in transcript_data['results']['transcripts']])
            else:
                full_text = "No transcript available"
        else:
            # Use the raw text
            full_text = transcript_text
        
        # Save the processed transcript to S3
        output_key = f"transcribed-conversations/{base_name}.txt"
        s3.put_object(
            Bucket=bucket_name,
            Key=output_key,
            Body=full_text.encode('utf-8'),
            ContentType='text/plain'
        )
        
        # Create the result object
        result = {
            'message': 'Transcript processed successfully',
            'bucket': bucket_name,
            'key': output_key,
            'transcriptLength': len(full_text),
            'transcriptUri': f"s3://{bucket_name}/{output_key}"
        }
        
        logger.info(f"Transcript processed successfully: {json.dumps(result)}")
        
        return {
            'statusCode': 200,
            'body': result
        }
    except Exception as e:
        logger.error(f"Error processing transcript: {str(e)}")
        return {
            'statusCode': 500,
            'body': {
                'error': f"Failed to process transcript: {str(e)}"
            }
        }
