import json
import boto3
import os
import logging
import uuid
import datetime
from botocore.config import Config

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize clients
config = Config(
    retries={"max_attempts": 10, "mode": "standard"},
    read_timeout=900,  # 15 minutes
    connect_timeout=60  # 1 minute
)
# Initialize clients
s3 = boto3.client("s3")
bedrock_runtime = boto3.client(
    "bedrock-runtime", config=config, region_name=os.environ.get("REGION")
)


def get_transcript_from_s3(bucket, transcript_uri=None, transcript_key=None):
    """
    Fetches the transcript text file from S3
    """
    try:
        # Determine the key to use
        key = None
        if transcript_key:
            key = transcript_key
        elif transcript_uri:
            # Extract the key from the S3 URI (format: s3://bucket-name/key)
            if transcript_uri.startswith(f"s3://{bucket}/"):
                key = transcript_uri.replace(f"s3://{bucket}/", "")
            elif transcript_uri.startswith("s3://"):
                parts = transcript_uri.replace("s3://", "").split("/", 1)
                if len(parts) > 1:
                    bucket = parts[0]
                    key = parts[1]
                else:
                    raise ValueError(f"Invalid S3 URI format: {transcript_uri}")
            elif transcript_uri.startswith("https://"):
                # Handle HTTPS S3 URLs
                if "s3.amazonaws.com" in transcript_uri:
                    path = transcript_uri.split("s3.amazonaws.com/", 1)[1]
                    if "/" in path:
                        parts = path.split("/", 1)
                        bucket = parts[0]
                        key = parts[1]
                    else:
                        raise ValueError(
                            f"Invalid S3 HTTPS URI format: {transcript_uri}"
                        )
                else:
                    key = transcript_uri
            else:
                key = transcript_uri

        if not key:
            raise ValueError("No key or URI provided to locate the transcript")

        # Debug: List contents of the bucket with the given prefix
        prefix = "/".join(key.split("/")[:-1]) + "/"  # Get the directory path
        logger.info(f"Listing contents of {bucket} with prefix {prefix}")
        list_response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        logger.info("Files found:")
        for obj in list_response.get("Contents", []):
            logger.info(f"- {obj['Key']}")

        logger.info(f"Attempting to get object with key: {key}")
        response = s3.get_object(Bucket=bucket, Key=key)
        transcript_text = response["Body"].read().decode("utf-8")

        # Check if the transcript is in JSON format
        try:
            transcript_data = json.loads(transcript_text)
            # Extract the transcript text from the JSON
            if (
                "results" in transcript_data
                and "transcripts" in transcript_data["results"]
            ):
                full_text = " ".join(
                    [
                        item["transcript"]
                        for item in transcript_data["results"]["transcripts"]
                    ]
                )
                return full_text
            else:
                return transcript_text
        except json.JSONDecodeError:
            # If it's not JSON, return the raw text
            return transcript_text
    except Exception as e:
        logger.error(f"Error getting transcript from S3: {str(e)}")
        raise e


def summarize_transcript(conversation_text, model_id, inference_profile_prefix):
    """
    Summarizes the meeting conversation using Amazon Bedrock with an inference profile.
    """
    try:
        prompt = f"""Even if it is a raw transcript of a meeting discussion, lacking clear structure and context and containing multiple speakers, incomplete sentences, and tangential topics, PLEASE PROVIDE a clear and thorough analysis as detailed as possible of this conversation. DO NOT miss any information. CAPTURE as much information as possible. Use bullet points instead of dashes in your summary.

IMPORTANT: For ALL section headers, use plain text with NO markdown formatting (no #, ##, **, or * symbols). Each section header should be in ALL CAPS followed by a colon. For example: "TITLE:" not "# TITLE" or "## TITLE".

CRITICAL INSTRUCTION: DO NOT use any markdown formatting symbols like #, ##, **, or * in your response, especially for the TITLE section. The TITLE section MUST start with "TITLE:" and not "# TITLE:" or any variation with markdown symbols.

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:

TITLE: Give the meeting a short title 2 or 3 words that is related to the overall context of the meeting, find a unique name such a company name or stakeholder and include it in the title       

TYPE: Depending on the context of the meeting, the conversation, the topic, and discussion, ALWAYS assign a type of meeting to this summary. Allowed Meeting types are: Client meeting, Team meeting, Technical meeting, Training Session, Status Update, Brainstorming Session, Review Meeting, External Stakeholder Meeting, Decision Making Meeting, and Problem Solving Meeting. This is crucial, don't overlook this.

STAKEHOLDERS:
Provide a list of the participants in the meeting, their company, and their corresponding roles. If the name is not provided or not understood, please replace the name with the word 'Not stated'. If a speaker does not introduce themselves, then don't include them in the STAKEHOLDERS section.  

CONTEXT:
provide a 10-15 summary or context sentences with the following information: Main reason for contact, Resolution provided, Final outcome, considering all the information above

MEETING OBJECTIVES:
provide all the objectives or goals of the meeting. Be thorough and detailed.

CONVERSATION DETAILS:
Customer's main concerns/requests
Solutions discussed
Important information verified
Decisions made

KEY POINTS DISCUSSED (Elaborate on each point, if applicable):
List all significant topics and issues
Important details or numbers mentioned
Any policies or procedures explained
Special requests or exceptions

ACTION ITEMS & NEXT STEPS (Elaborate on each point, if applicable):
What the customer needs to do:
Immediate actions required
Future steps to take
Important dates or deadlines

What the company will do (Elaborate on each point, if applicable):
Processing or handling steps
Follow-up actions promised
Timeline for completion

ADDITIONAL NOTES (Elaborate on each point, if applicable):
Any notable issues or concerns
Follow-up recommendations
Important reminders

TECHNICAL REQUIREMENTS & RESOURCES (Elaborate on each point, if applicable):
Systems or tools discussed/needed
Technical specifications mentioned
Required access or permissions
Resource allocation details

TIMELINE & MILESTONES (Elaborate on each point, if applicable):
Project phases discussed
Key dates and deadlines
Dependencies between tasks
Critical path activities

BUDGET CONSIDERATIONS (Elaborate on each point, if applicable):
Cost estimates discussed
Budget constraints mentioned
Financial implications
Resource allocation costs

BLOCKERS & CHALLENGES (Elaborate on each point, if applicable):
Current obstacles identified
Resource constraints
Dependencies on other teams/projects
Open issues requiring escalation
Proposed solutions to challenges

AGREEMENTS & COMMITMENTS (Elaborate on each point, if applicable):
Verbal agreements made
Responsibilities assigned
Deadlines agreed upon
Resources committed
Conditions set

COMMUNICATION PLAN (Elaborate on each point, if applicable):
Preferred communication channels
Key points of contact
Escalation path
Status update frequency
Document sharing method

FOLLOW-UP REQUIREMENTS (Elaborate on each point, if applicable):
Required approvals
Documentation needs
Distribution list
Review process
Feedback mechanisms

QUESTIONS AND ANSWERS:
In this section, provide ALL and every single question asked during the meeting with their respective answers mentioned in the conversation. Additionally, capture any sentence that sounds like a question (with their respective answer) even if it does not use the proper question grammar and intonation.

Here's the conversation:
{conversation_text}"""

        response = bedrock_runtime.invoke_model(
            modelId=f"{inference_profile_prefix}.{model_id}",
            body=json.dumps(
                {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 8000,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "top_p": 0.9,
                }
            ),
        )

        response_body = json.loads(response["body"].read().decode())
        summary = response_body["content"][0]["text"]

        return summary
    except Exception as e:
        logger.error(f"Error in summarization: {str(e)}")
        raise e


def format_summary_for_txt(summary, job_name, transcript_key):
    """
    Formats the summary with headers and metadata for the text file.
    """
    formatted_summary = f"""Conversation Summary
================
Transcription Job: {job_name}
Original Transcript: {transcript_key}
{datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")} 
================

{summary}

================
End of Summary
"""
    return formatted_summary


def get_base_name(job_name):
    """
    Extracts base name from the transcription job name
    """
    logger.info(f"Original job name: {job_name}")

    if job_name.startswith("transcription-"):
        base = job_name[13:]
    else:
        base = job_name
    logger.info(f"After removing prefix: {base}")

    if "-2024" in base:
        base = base.split("-2024")[0]
    elif "-2025" in base:
        base = base.split("-2025")[0]

    base = base.strip("-")

    logger.info(f"Final base name: {base}")
    return base


def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Extract parameters from the event
        job_name = event.get("TranscriptionJobName")
        transcript_uri = event.get("transcriptUri")
        transcript_key = event.get("transcriptKey")
        bucket_name = event.get("bucket")

        # Get model ID from environment variable or use inference profile
        # Format the inference profile ARN using the model ID
        model_id = os.environ.get("MODEL_ID")
        inference_profile_prefix = os.environ.get("INFERENCE_PROFILE_PREFIX")

        if not job_name:
            raise ValueError("TranscriptionJobName not found in event")
        if not bucket_name:
            raise ValueError("bucket not found in event")

        logger.info(f"Job name: {job_name}")
        logger.info(f"Transcript URI: {transcript_uri}")
        logger.info(f"Transcript Key: {transcript_key}")
        logger.info(f"Bucket name: {bucket_name}")

        # Extract the base name from the job name
        base_name = get_base_name(job_name)

        # Look for the processed transcript in transcribed-conversations/
        processed_transcript_key = f"transcribed-conversations/{base_name}.txt"
        logger.info(f"Looking for processed transcript at: {processed_transcript_key}")

        try:
            conversation_text = get_transcript_from_s3(
                bucket=bucket_name, transcript_key=processed_transcript_key
            )
            logger.info(
                f"Successfully retrieved processed transcript, length: {len(conversation_text)}"
            )
        except Exception as e:
            logger.error(f"Error retrieving processed transcript: {str(e)}")
            # Fall back to trying the original transcript
            try:
                logger.info(
                    f"Falling back to original transcript URI: {transcript_uri}"
                )
                conversation_text = get_transcript_from_s3(
                    bucket=bucket_name,
                    transcript_uri=transcript_uri,
                    transcript_key=transcript_key,
                )
                logger.info(
                    f"Successfully retrieved original transcript, length: {len(conversation_text)}"
                )
            except Exception as e2:
                logger.error(f"Error retrieving original transcript: {str(e2)}")
                raise ValueError(
                    f"Could not retrieve transcript: {str(e)}, fallback error: {str(e2)}"
                )

        # Generate summary
        summary = summarize_transcript(
            conversation_text, model_id, inference_profile_prefix
        )
        formatted_summary = format_summary_for_txt(
            summary, job_name, processed_transcript_key
        )

        # Save the summary
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        summary_key = f"summaries/{base_name}-{timestamp}-summary.txt"

        # Save the summary to S3
        s3.put_object(
            Bucket=bucket_name,
            Key=summary_key,
            Body=formatted_summary.encode("utf-8"),
            ContentType="text/plain",
            ContentDisposition="inline",
        )

        s3_location = f"s3://{bucket_name}/{summary_key}"
        logger.info(f"Summary saved to: {s3_location}")

        return {
            "statusCode": 200,
            "body": {
                "message": "Summary generated and saved successfully",
                "summaryLocation": s3_location,
                "jobName": job_name,
                "baseName": base_name,
                "transcriptKey": processed_transcript_key,
                "summaryKey": summary_key,
            },
        }
    except Exception as e:
        logger.error(f"Error in summarization: {str(e)}")
        logger.error(f"Error: {str(e)}")
        logger.error(f"Event structure: {json.dumps(event, indent=2)}")
        
        # Re-raise the exception to fail the Step Function properly
        raise Exception(f"Summarization failed: {str(e)}")
