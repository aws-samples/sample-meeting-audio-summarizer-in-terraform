import json
import boto3
import os
from datetime import datetime
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    transcribe = boto3.client("transcribe")

    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Get bucket and file information from the event
        bucket = event.get("bucket")
        audio_file = event.get("inputFile")  # Changed from 'file' to 'inputFile'
        
        # If bucket is not in the event, try to get it from environment variables
        if not bucket:
            bucket = os.environ.get('BUCKET_NAME')

        # Log the received parameters for debugging
        logger.info(f"Extracted bucket: '{bucket}', type: {type(bucket).__name__}")
        logger.info(f"Extracted audio_file: '{audio_file}', type: {type(audio_file).__name__}")

        # Validate input parameters
        if not bucket or not audio_file:
            raise ValueError(
                "Missing required parameters: 'bucket' and 'inputFile' are required"
            )

        # Ensure the audio file is in the audio/ prefix
        if not audio_file.startswith("audio/"):
            raise ValueError("Audio file must be in the audio/ folder")

        # Validate file extension
        valid_formats = ["mp3", "mp4", "wav", "flac", "ogg", "m4a", "amr", "webm"]
        file_extension = audio_file.split(".")[-1].lower()
        if file_extension not in valid_formats:
            raise ValueError(
                f"Invalid file format. Supported formats: {', '.join(valid_formats)}"
            )

        # Generate job name - extract filename from path
        path_parts = audio_file.split('/')
        filename = path_parts[-1]  # Get the actual filename
        base_file_name = filename.rsplit(".", 1)[0]
        sanitized_file_name = "".join(c if c.isalnum() else "-" for c in base_file_name)
        current_date = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        job_name = f"transcription-{sanitized_file_name}-{current_date}"[:200]

        # Construct the S3 URI
        s3_uri = f"s3://{bucket}/{audio_file}"
        output_key = f"transcripts/{base_file_name}.json"

        # Check if output file already exists
        s3_client = boto3.client("s3")
        try:
            s3_client.head_object(Bucket=bucket, Key=output_key)
            logger.warning(f"Output file already exists: {output_key}")
            # Continue anyway, will overwrite
        except s3_client.exceptions.ClientError:
            pass  # File doesn't exist, which is good

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
            IdentifyLanguage=True,  # Enable automatic language identification
            LanguageOptions=["en-US", "es-US", "fr-CA", "fr-FR", "de-DE", "it-IT", "pt-BR", "ja-JP", "ko-KR", "zh-CN", "hi-IN", "ar-SA"],  # Common language options
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

        job_details = {
            "jobName": job_name,
            "status": response["TranscriptionJob"]["TranscriptionJobStatus"],
            "jobCreationTime": response["TranscriptionJob"]["CreationTime"].strftime(
                "%Y-%m-%d %H:%M:%S"
            ),
            "inputFile": audio_file,
            "outputLocation": output_key,
            "mediaFormat": file_extension,
            "bucket": bucket,
        }

        logger.info(f"Job started successfully: {json.dumps(job_details)}")

        return {"statusCode": 200, "body": job_details}

    except ValueError as ve:
        error_msg = str(ve)
        logger.error(f"Validation error: {error_msg}")
        return {
            "statusCode": 400,
            "body": {"error": "Validation Error", "message": error_msg},
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Unexpected error: {error_msg}", exc_info=True)
        return {
            "statusCode": 500,
            "body": {"error": "Internal Error", "message": error_msg},
        }
