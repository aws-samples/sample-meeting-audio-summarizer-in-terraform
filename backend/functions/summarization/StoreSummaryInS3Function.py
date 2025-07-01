import json
import boto3
import os
import uuid
from datetime import datetime
import re

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    try:
        print("Received event:", json.dumps(event))
        
        # Debug: Print the full event structure
        print("Full event structure:")
        print(json.dumps(event, indent=2))
        
        # Get parameters from the event
        job_name = event.get('TranscriptionJobName')
        summary_location = event.get('summaryLocation')
        bucket_name = event.get('bucket', os.environ.get('BUCKET_NAME'))
        
        print(f"Debug - Extracted parameters: job_name={job_name}, summary_location={summary_location}, bucket_name={bucket_name}")
        
        if not job_name:
            raise ValueError("TranscriptionJobName not found in event")
        if not summary_location:
            raise ValueError("summaryLocation not found in event")
        if not bucket_name:
            raise ValueError("bucket not found in event or environment variables")
            
        print(f"Job name: {job_name}")
        print(f"Summary location: {summary_location}")
        print(f"Bucket name: {bucket_name}")

        # Read the summary file from S3
        summary_key = summary_location.replace(f"s3://{bucket_name}/", "")
        print(f"Summary key: {summary_key}")
        
        try:
            response = s3.get_object(Bucket=bucket_name, Key=summary_key)
            summary_text = response['Body'].read().decode('utf-8')
            print(f"Successfully read summary from S3, length: {len(summary_text)}")
        except Exception as e:
            print(f"Error reading summary from S3: {str(e)}")
            raise e

        # Parse the summary as JSON if possible
        try:
            summary_data = json.loads(summary_text)
            print("Successfully parsed summary as JSON")
        except:
            # If not JSON, treat as plain text
            print("Summary is not JSON, treating as plain text")
            summary_data = {"summary": summary_text}

        # Extract summary sections
        summary = summary_data.get('summary', summary_text)
        action_items = summary_data.get('actionItems', [])
        key_points = summary_data.get('keyPoints', [])

        # Prepare searchable text from all sections
        searchable_text = summary
        if isinstance(action_items, list):
            searchable_text += ' ' + ' '.join(action_items)
        elif isinstance(action_items, str):
            searchable_text += ' ' + action_items
        if isinstance(key_points, list):
            searchable_text += " " + " ".join(key_points)
        elif isinstance(key_points, str):
            searchable_text += " " + key_points

        # Create search tokens
        # This is a simplified version - for production, consider better tokenization
        tokens = set(re.findall(r"\b\w+\b", searchable_text.lower()))

        # Create DynamoDB items
        timestamp = datetime.utcnow().isoformat()

        # Main summary record
        summary_record = {
            "MeetingId": job_name,
            "Timestamp": timestamp,
            "SummaryText": summary[:4000] if len(summary) > 4000 else summary,  # DynamoDB has size limits
            "ActionItems": (
                action_items
                if isinstance(action_items, list)
                else [action_items] if action_items else []
            ),
            "KeyPoints": (
                key_points
                if isinstance(key_points, list)
                else [key_points] if key_points else []
            ),
            "SummaryLocation": summary_location,
            "SearchTokens": list(tokens)[:100],  # DynamoDB has size limits, cap at 100 tokens
        }

        # Store summary metadata in S3
        try:
            # Create a metadata JSON file
            metadata_key = summary_key.replace(".txt", "-metadata.json")
            print(f"Storing summary metadata in S3: {metadata_key}")
            
            # Convert the summary record to JSON
            metadata_json = json.dumps(summary_record)
            
            # Upload the metadata to S3
            s3.put_object(
                Bucket=bucket_name,
                Key=metadata_key,
                Body=metadata_json,
                ContentType="application/json"
            )
            print("Successfully stored summary metadata in S3")
        except Exception as e:
            print(f"Warning: Could not store metadata in S3: {str(e)}")
            # Continue execution even if metadata storage fails

        # Return response with clear structure
        response = {
            "statusCode": 200,
            "TranscriptionJobName": job_name,
            "body": {
                "jobName": job_name,
                "storedAt": timestamp,
                "summaryLocation": summary_location
            }
        }
        
        print(f"Returning response: {json.dumps(response, indent=2)}")
        return response

    except Exception as e:
        print(f"Error storing summary: {str(e)}")
        return {"statusCode": 500, "body": {"error": str(e)}}
