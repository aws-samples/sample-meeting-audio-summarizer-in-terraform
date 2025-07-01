import json
import boto3
import os
import uuid
from datetime import datetime
import logging
import re
from dateutil import parser
import subprocess
import tempfile

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")


def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Extract meeting ID and other data from the event
        meeting_id = event.get("TranscriptionJobName", str(uuid.uuid4()))
        transcript_uri = event.get("transcriptUri")
        bucket_name = event.get("bucket")
        input_file = event.get("inputFile")

        if not bucket_name:
            raise ValueError("Bucket name not provided in event")

        # First try to get the transcript from the transcripts/ directory
        transcript_key = None
        transcript_data = None

        # Try different possible locations for the transcript
        possible_locations = [
            f"transcripts/{os.path.basename(input_file).split('.')[0]}.json",  # Primary location
            (
                transcript_uri.replace(f"s3://{bucket_name}/", "")
                if transcript_uri and transcript_uri.startswith(f"s3://{bucket_name}/")
                else None
            ),
            (
                transcript_uri.split(f"/{bucket_name}/")[1]
                if transcript_uri and f"/{bucket_name}/" in transcript_uri
                else None
            ),
            transcript_uri,
        ]

        # Filter out None values
        possible_locations = [loc for loc in possible_locations if loc]

        # Try each location until we find the transcript
        for location in possible_locations:
            try:
                logger.info(f"Trying to retrieve transcript from: {location}")
                response = s3.get_object(Bucket=bucket_name, Key=location)
                transcript_text = response["Body"].read().decode("utf-8")
                transcript_data = json.loads(transcript_text)
                transcript_key = location
                logger.info(f"Successfully retrieved transcript from S3: {location}")
                break
            except Exception as e:
                logger.warning(
                    f"Could not retrieve transcript from {location}: {str(e)}"
                )

        # If we still don't have the transcript, try to construct a path from the input file name
        if not transcript_data:
            try:
                # Extract the base name without extension
                base_name = os.path.basename(input_file).split(".")[0]

                # Try with .json extension in transcripts directory
                json_key = f"transcripts/{base_name}.json"
                logger.info(f"Trying fallback key: {json_key}")
                response = s3.get_object(Bucket=bucket_name, Key=json_key)
                transcript_text = response["Body"].read().decode("utf-8")
                transcript_data = json.loads(transcript_text)
                transcript_key = json_key
                logger.info(
                    f"Successfully retrieved transcript with fallback key: {json_key}"
                )
            except Exception as fallback_error:
                logger.error(
                    f"Error retrieving transcript with fallback key: {str(fallback_error)}"
                )
                raise ValueError(
                    f"Could not find transcript in any expected location. Tried: {possible_locations}"
                )

        # Log the structure of the transcript data to help with debugging
        logger.info(
            f"Transcript data structure: {json.dumps(list(transcript_data.keys()))}"
        )
        if "results" in transcript_data:
            logger.info(
                f"Results structure: {json.dumps(list(transcript_data['results'].keys()))}"
            )

        # Calculate duration from transcript data
        calculated_duration_seconds = calculate_duration_from_transcript(
            transcript_data
        )
        method_used = "transcript_analysis"

        # If we couldn't calculate from transcript, try other methods
        if calculated_duration_seconds is None:
            # Method 1: Try to get the audio file and analyze it directly
            try:
                audio_duration_from_file = get_audio_duration_from_file(
                    bucket_name, input_file
                )
                if audio_duration_from_file:
                    calculated_duration_seconds = audio_duration_from_file
                    method_used = "audio_file"
            except Exception as e:
                logger.warning(f"Could not get duration from audio file: {str(e)}")

            # Method 2: Try to get duration from audio_duration field
            if calculated_duration_seconds is None:
                try:
                    if (
                        "results" in transcript_data
                        and "audio_duration" in transcript_data["results"]
                    ):
                        calculated_duration_seconds = float(
                            transcript_data["results"]["audio_duration"]
                        )
                        method_used = "audio_duration_field"
                except Exception as e:
                    logger.warning(
                        f"Could not get duration from audio_duration field: {str(e)}"
                    )

            # Method 3: Try to get duration from transcript job info
            if calculated_duration_seconds is None:
                try:
                    if (
                        "jobInfo" in transcript_data
                        and "mediaDuration" in transcript_data["jobInfo"]
                    ):
                        calculated_duration_seconds = float(
                            transcript_data["jobInfo"]["mediaDuration"]
                        )
                        method_used = "media_duration_field"
                except Exception as e:
                    logger.warning(
                        f"Could not get duration from mediaDuration field: {str(e)}"
                    )

        # If we still don't have a duration, use a default
        if calculated_duration_seconds is None:
            calculated_duration_seconds = 1800  # Default to 30 minutes (1800 seconds)
            method_used = "default"

        # Convert to minutes, ensuring we don't round down
        calculated_duration = max(1, int(calculated_duration_seconds / 60))

        logger.info(
            f"Final calculated duration: {calculated_duration} minutes (from {calculated_duration_seconds:.2f} seconds using method: {method_used})"
        )

        # Extract language from transcript
        detected_language = extract_language(transcript_data)

        # Extract date from input file name or use current date
        meeting_date = extract_date_from_filename(input_file)

        # Extract speakers and participant count
        speakers, participant_count = extract_speakers(transcript_data)

        # Extract keywords from transcript
        keywords = extract_keywords(transcript_data)

        # Generate a unique ID for the statistics record
        statistics_id = str(uuid.uuid4())

        # Create item for DynamoDB
        item = {
            "id": statistics_id,  # Add the id field that was missing
            "MeetingId": meeting_id,
            "duration": calculated_duration,
            "durationSeconds": int(calculated_duration_seconds),
            "language": detected_language,
            "date": meeting_date,
            "dayOfWeek": get_day_of_week(meeting_date),
            "durationMethod": method_used,
            "participantCount": participant_count,
            "speakers": speakers,
            "keywords": keywords,
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat(),
        }
        
        # Note: We don't try to extract meeting type here because the summary is generated after this function runs.
        # The meeting type will be added later when the summary is saved to DynamoDB.

        # Save to DynamoDB
        table_name = os.environ.get("STATISTICS_TABLE", "MeetingStatistics")
        table = dynamodb.Table(table_name)

        # First, check if a record already exists for this meeting
        existing_record = None
        try:
            # Try to find by MeetingId first
            response = table.query(
                IndexName="MeetingId-index",  # Assuming you have a GSI on MeetingId
                KeyConditionExpression=boto3.dynamodb.conditions.Key("MeetingId").eq(meeting_id),
                Limit=1
            )
            
            if response.get("Items") and len(response["Items"]) > 0:
                existing_record = response["Items"][0]
                logger.info(f"Found existing record by MeetingId: {existing_record['id']}")
            
            # If not found by MeetingId, try to find by base name in case it was created during summary generation
            if not existing_record and input_file:
                base_name = os.path.basename(input_file).split('.')[0]
                
                # Scan for records with matching title or similar attributes
                scan_response = table.scan(
                    FilterExpression=boto3.dynamodb.conditions.Attr("title").contains(base_name)
                )
                
                if scan_response.get("Items") and len(scan_response["Items"]) > 0:
                    existing_record = scan_response["Items"][0]
                    logger.info(f"Found existing record by title similarity: {existing_record['id']}")
        except Exception as e:
            logger.warning(f"Error checking for existing records: {str(e)}")
            # Continue with creating a new record

        if existing_record:
            # Update existing record with new statistics data
            record_id = existing_record["id"]
            logger.info(f"Updating existing statistics record {record_id}")
            
            # Merge the new data with existing data
            update_expression = "SET "
            expression_attribute_values = {}
            expression_attribute_names = {}
            
            # Add all the new fields to the update expression
            for key, value in item.items():
                if key != "id" and key != "createdAt":  # Don't update the ID or creation timestamp
                    update_expression += f"#{key} = :{key}, "
                    expression_attribute_names[f"#{key}"] = key
                    expression_attribute_values[f":{key}"] = value
            
            # Add updatedAt timestamp
            update_expression += "#updatedAt = :updatedAt"
            expression_attribute_names["#updatedAt"] = "updatedAt"
            expression_attribute_values[":updatedAt"] = datetime.utcnow().isoformat()
            
            # Update the record
            table.update_item(
                Key={"id": record_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values
            )
            
            # Use the existing record ID in the response
            statistics_id = record_id
        else:
            # No existing record found, create a new one
            logger.info(f"Creating new statistics record: {json.dumps(item)}")
            table.put_item(Item=item)
            statistics_id = item["id"]

        return {
            "statusCode": 200,
            "body": {
                "message": "Meeting statistics extracted successfully",
                "meetingId": meeting_id,
                "statisticsId": statistics_id,  # Include the statistics ID in the response
                "transcriptKey": transcript_key,
                "duration": calculated_duration,
                "durationSeconds": int(calculated_duration_seconds),
                "durationMethod": method_used,
                "participantCount": participant_count,
            },
        }
    except Exception as e:
        logger.error(f"Error extracting meeting statistics: {str(e)}")
        return {
            "statusCode": 500,
            "body": {"error": f"Failed to extract meeting statistics: {str(e)}"},
        }


def calculate_duration_from_transcript(transcript_data):
    """Calculate duration from transcript data by analyzing timestamps"""
    try:
        # Check if we have speaker_labels with segments
        if (
            "speaker_labels" in transcript_data
            and "segments" in transcript_data["speaker_labels"]
        ):
            segments = transcript_data["speaker_labels"]["segments"]
            if segments:
                # Get the earliest start time and latest end time across all segments
                start_times = [
                    float(segment["start_time"])
                    for segment in segments
                    if "start_time" in segment
                ]
                end_times = [
                    float(segment["end_time"])
                    for segment in segments
                    if "end_time" in segment
                ]

                if start_times and end_times:
                    earliest_start = min(start_times)
                    latest_end = max(end_times)
                    duration = latest_end - earliest_start
                    logger.info(
                        f"Duration calculated from speaker segments: {duration} seconds"
                    )
                    return duration

        # Check if we have items with start_time and end_time
        if "results" in transcript_data and "items" in transcript_data["results"]:
            items = transcript_data["results"]["items"]
            if items:
                # Filter items that have start_time and end_time
                timed_items = [
                    item
                    for item in items
                    if "start_time" in item and "end_time" in item
                ]
                if timed_items:
                    # Get the earliest start time and latest end time
                    start_times = [float(item["start_time"]) for item in timed_items]
                    end_times = [float(item["end_time"]) for item in timed_items]

                    earliest_start = min(start_times)
                    latest_end = max(end_times)
                    duration = latest_end - earliest_start
                    logger.info(
                        f"Duration calculated from transcript items: {duration} seconds"
                    )
                    return duration

        # Check if we have transcripts array with timestamps
        if "transcripts" in transcript_data:
            transcripts = transcript_data["transcripts"]
            if isinstance(transcripts, list) and transcripts:
                # Look for start and end times in each transcript
                start_times = []
                end_times = []

                for transcript in transcripts:
                    if "start_time" in transcript and "end_time" in transcript:
                        start_times.append(float(transcript["start_time"]))
                        end_times.append(float(transcript["end_time"]))

                if start_times and end_times:
                    earliest_start = min(start_times)
                    latest_end = max(end_times)
                    duration = latest_end - earliest_start
                    logger.info(
                        f"Duration calculated from transcripts array: {duration} seconds"
                    )
                    return duration

        logger.warning("Could not calculate duration from transcript data")
        return None
    except Exception as e:
        logger.error(f"Error calculating duration from transcript: {str(e)}")
        return None


def get_audio_duration_from_file(bucket_name, input_file):
    """Try to get the audio duration directly from the file using ffprobe"""
    try:
        # Download the audio file to a temporary location
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=os.path.splitext(input_file)[1]
        ) as temp_file:
            temp_path = temp_file.name
            s3.download_file(bucket_name, input_file, temp_path)

            # Use ffprobe to get the duration
            cmd = [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                temp_path,
            ]

            # Run the command and capture output
            result = subprocess.run(cmd, capture_output=True, text=True)

            # Clean up the temporary file
            os.unlink(temp_path)

            # Parse the duration
            if result.returncode == 0 and result.stdout.strip():
                duration = float(result.stdout.strip())
                logger.info(f"Audio duration from file: {duration} seconds")
                return duration
    except Exception as e:
        logger.warning(f"Error getting audio duration from file: {str(e)}")

    return None


def extract_language(transcript_data):
    """Extract language from transcript data"""
    try:
        # First check for language identification results from Transcribe
        if "results" in transcript_data and "language_identification" in transcript_data["results"]:
            # This is the format when using IdentifyLanguage=True in Transcribe
            if isinstance(transcript_data["results"]["language_identification"], list) and transcript_data["results"]["language_identification"]:
                language = transcript_data["results"]["language_identification"][0]["code"]
                score = transcript_data["results"]["language_identification"][0].get("score", 0)
                logger.info(f"Detected language from Transcribe identification: {language} (score: {score})")
                return language
        
        # Check for language_code in results (older format)
        if "results" in transcript_data and "language_code" in transcript_data["results"]:
            language = transcript_data["results"]["language_code"]
            logger.info(f"Detected language from Transcribe results: {language}")
            return language
        
        # Check for language_code at the root level
        if "language_code" in transcript_data:
            language = transcript_data["language_code"]
            logger.info(f"Detected language from root level: {language}")
            return language
            
        # Check for language in jobInfo
        if "jobInfo" in transcript_data and "language" in transcript_data["jobInfo"]:
            language = transcript_data["jobInfo"]["language"]
            logger.info(f"Detected language from jobInfo: {language}")
            return language
            
    except Exception as e:
        logger.error(f"Error extracting language: {str(e)}")

    logger.warning("Using default language: en-US")
    return "en-US"  # Default to English


def extract_date_from_filename(filename):
    """Extract date from filename or use current date"""
    try:
        # Look for date patterns in the filename
        date_patterns = [
            r"(\d{4}-\d{2}-\d{2})",  # YYYY-MM-DD
            r"(\d{2}-\d{2}-\d{4})",  # DD-MM-YYYY or MM-DD-YYYY
            r"(\d{8})",  # YYYYMMDD
        ]

        base_name = os.path.basename(filename)

        for pattern in date_patterns:
            match = re.search(pattern, base_name)
            if match:
                date_str = match.group(1)
                try:
                    # Try to parse the date
                    date_obj = parser.parse(date_str)
                    logger.info(f"Extracted date from filename: {date_obj.isoformat()}")
                    return date_obj.isoformat()
                except:
                    pass
    except Exception as e:
        logger.error(f"Error extracting date from filename: {str(e)}")

    # Default to current date
    current_date = datetime.utcnow().isoformat()
    logger.warning(f"Using current date: {current_date}")
    return current_date


def get_day_of_week(date_str):
    """Get day of week from date string"""
    try:
        date_obj = parser.parse(date_str)
        day_of_week = date_obj.strftime("%A")  # Monday, Tuesday, etc.
        logger.info(f"Day of week: {day_of_week}")
        return day_of_week
    except Exception as e:
        logger.error(f"Error getting day of week: {str(e)}")
        return "Unknown"


def extract_speakers(transcript_data):
    """Extract speakers and participant count from transcript data"""
    try:
        speakers = set()

        # Check if we have speaker_labels
        if (
            "speaker_labels" in transcript_data
            and "speakers" in transcript_data["speaker_labels"]
        ):
            speaker_count = int(transcript_data["speaker_labels"]["speakers"])
            logger.info(f"Speaker count from speaker_labels: {speaker_count}")

            # Get speaker IDs from segments
            if "segments" in transcript_data["speaker_labels"]:
                for segment in transcript_data["speaker_labels"]["segments"]:
                    if "speaker_label" in segment:
                        speakers.add(segment["speaker_label"])

        # If we don't have speaker_labels, try to extract from items
        elif "results" in transcript_data and "items" in transcript_data["results"]:
            items = transcript_data["results"]["items"]
            for item in items:
                if "speaker_label" in item:
                    speakers.add(item["speaker_label"])

        # Convert speakers set to list
        speakers_list = list(speakers)
        participant_count = len(speakers_list)

        logger.info(f"Extracted speakers: {speakers_list}, count: {participant_count}")
        return speakers_list, participant_count
    except Exception as e:
        logger.error(f"Error extracting speakers: {str(e)}")
        return [], 0


def extract_keywords(transcript_data):
    """Extract keywords from transcript data"""
    try:
        # Get all words from the transcript
        all_words = []

        if "results" in transcript_data and "items" in transcript_data["results"]:
            items = transcript_data["results"]["items"]
            for item in items:
                if item.get("type") == "pronunciation" and "alternatives" in item:
                    for alt in item["alternatives"]:
                        if "content" in alt:
                            word = alt["content"].lower()
                            # Filter out short words and common stop words
                            if len(word) > 3 and word not in STOP_WORDS:
                                all_words.append(word)

        # Count word frequencies
        word_counts = {}
        for word in all_words:
            if word in word_counts:
                word_counts[word] += 1
            else:
                word_counts[word] = 1

        # Sort by frequency and get top 20
        sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
        top_keywords = [
            {"word": word, "count": count} for word, count in sorted_words[:20]
        ]

        logger.info(f"Extracted top keywords: {top_keywords}")
        return top_keywords
    except Exception as e:
        logger.error(f"Error extracting keywords: {str(e)}")
        return []


# Common English stop words to filter out
STOP_WORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "in",
    "on",
    "at",
    "to",
    "for",
    "with",
    "by",
    "about",
    "against",
    "between",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "from",
    "up",
    "down",
    "of",
    "off",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "s",
    "t",
    "can",
    "will",
    "just",
    "don",
    "should",
    "now",
    "this",
    "that",
    "these",
    "those",
    "i",
    "me",
    "my",
    "myself",
    "we",
    "our",
    "ours",
    "ourselves",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves",
    "he",
    "him",
    "his",
    "himself",
    "she",
    "her",
    "hers",
    "herself",
    "it",
    "its",
    "itself",
    "they",
    "them",
    "their",
    "theirs",
    "themselves",
    "what",
    "which",
    "who",
    "whom",
    "whose",
    "have",
    "has",
    "had",
    "having",
    "do",
    "does",
    "did",
    "doing",
    "would",
    "should",
    "could",
    "ought",
    "i'm",
    "you're",
    "he's",
    "she's",
    "it's",
    "we're",
    "they're",
    "i've",
    "you've",
    "we've",
    "they've",
    "i'd",
    "you'd",
    "he'd",
    "she'd",
    "we'd",
    "they'd",
    "i'll",
    "you'll",
    "he'll",
    "she'll",
    "we'll",
    "they'll",
    "isn't",
    "aren't",
    "wasn't",
    "weren't",
    "hasn't",
    "haven't",
    "hadn't",
    "doesn't",
    "don't",
    "didn't",
    "won't",
    "wouldn't",
    "shan't",
    "shouldn't",
    "can't",
    "cannot",
    "couldn't",
    "mustn't",
    "let's",
    "that's",
    "who's",
    "what's",
    "here's",
    "there's",
    "when's",
    "where's",
    "why's",
    "how's",
    "yeah",
    "um",
    "uh",
    "like",
    "okay",
    "ok",
    "right",
    "well",
    "hmm",
    "huh",
    "oh",
    "ah",
    "actually",
    "basically",
    "literally",
    "really",
    "stuff",
    "things",
    "thing",
    "something",
    "anything",
    "everything",
    "nothing",
    "way",
    "much",
    "many",
    "lot",
    "lots",
    "kind",
    "sorts",
}
