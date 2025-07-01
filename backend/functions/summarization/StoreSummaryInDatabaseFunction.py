import json
import boto3
import os
import logging
import uuid
import re
from datetime import datetime
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Custom JSON encoder to handle Decimal objects
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def clean_text(text):
    """Clean text by removing special characters and formatting"""
    if not text:
        return ""
    
    # Remove ** markers
    text = text.replace("**", "")
    
    # Remove bullet points, hyphens, and asterisks from the beginning of the line
    text = re.sub(r'^\s*[•\-\*]\s*', '', text)
    
    # Remove any numbering at the beginning (like "1. ", "2. ")
    text = re.sub(r'^\s*\d+\.\s*', '', text)
    
    # Remove any remaining leading/trailing whitespace
    text = text.strip()
    
    return text

def filter_empty_values(array_data):
    """Filter out empty values from an array and clean the text"""
    if not array_data:
        return []
    
    # Filter out empty items and clean the text in each item
    cleaned_items = []
    for item in array_data:
        if item and item.strip():
            cleaned_item = clean_text(item)
            if cleaned_item:  # Only add if still non-empty after cleaning
                cleaned_items.append(cleaned_item)
    
    return cleaned_items

def extract_title_from_filename(filename):
    """Extract a readable title from the filename"""
    # Remove path and extension
    base_name = os.path.basename(filename)
    name_without_ext = os.path.splitext(base_name)[0]
    
    # Remove any timestamp prefix if present
    if '--' in name_without_ext:
        name_without_ext = name_without_ext.split('--', 1)[1]
    
    # Replace hyphens and underscores with spaces
    title = name_without_ext.replace('-', ' ').replace('_', ' ')
    
    # Capitalize words
    title = ' '.join(word.capitalize() for word in title.split())
    
    return title

def extract_meeting_type(content):
    """Extract the meeting type from the summary content"""
    # Look for the TYPE section in the summary
    type_match = re.search(r'TYPE:\s*(.+?)(?:\n\n|\Z)', content, re.DOTALL)
    if type_match:
        meeting_type = type_match.group(1).strip()
        # Clean up the meeting type (remove any special characters)
        meeting_type = clean_text(meeting_type)
        return meeting_type
    
    # If TYPE section not found, try to find it in other formats
    type_match = re.search(r'MEETING TYPE:\s*(.+?)(?:\n\n|\Z)', content, re.DOTALL)
    if type_match:
        meeting_type = type_match.group(1).strip()
        meeting_type = clean_text(meeting_type)
        return meeting_type
    
    return "Other"  # Default type if not found

def extract_sections(content):
    """Extract all sections from the summary content using a simpler approach"""
    # Define the section names we're looking for
    section_names = [
        "STAKEHOLDERS",
        "CONTEXT",
        "MEETING OBJECTIVES",
        "CONVERSATION DETAILS",
        "KEY POINTS DISCUSSED",
        "ACTION ITEMS & NEXT STEPS",
        "ADDITIONAL NOTES",
        "TECHNICAL REQUIREMENTS & RESOURCES",
        "TIMELINE & MILESTONES",
        "BUDGET CONSIDERATIONS",
        "BLOCKERS & CHALLENGES",
        "AGREEMENTS & COMMITMENTS",
        "COMMUNICATION PLAN",
        "FOLLOW-UP REQUIREMENTS",
        "QUESTIONS AND ANSWERS",
        "TITLE",
        "TYPE",
        "MEETING TYPE"
    ]
    
    # Alternative section names (for flexibility)
    alternative_names = {
        "ACTION ITEMS & NEXT STEPS": ["ACTION ITEMS", "NEXT STEPS"],
        "MEETING OBJECTIVES": ["OBJECTIVES"],
        "TITLE": ["MEETING TITLE", "SUMMARY TITLE"],
        "TYPE": ["MEETING TYPE"]
    }
    
    # Find all section headers in the content
    section_headers = []
    for section in section_names:
        # Look for the section name with potential decorations (**, --, etc.)
        matches = re.finditer(rf"(?:^|\n)[ \t]*(?:\*\*|\-\-)?[ \t]*{section}[ \t]*(?:\*\*|\-\-)?[ \t]*(?:\(.*?\))?[ \t]*(?::|$)", content, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            section_headers.append((match.start(), match.end(), section))
        
        # Look for alternative names if defined
        if section in alternative_names:
            for alt_name in alternative_names[section]:
                alt_matches = re.finditer(rf"(?:^|\n)[ \t]*(?:\*\*|\-\-)?[ \t]*{alt_name}[ \t]*(?:\*\*|\-\-)?[ \t]*(?:\(.*?\))?[ \t]*(?::|$)", content, re.IGNORECASE | re.MULTILINE)
                for match in alt_matches:
                    section_headers.append((match.start(), match.end(), section))  # Use the standard name
    
    # Sort headers by their position in the content
    section_headers.sort()
    
    # Extract content between headers
    sections = {}
    for i, (start, end, section) in enumerate(section_headers):
        # Get the content from the end of this header to the start of the next one
        if i < len(section_headers) - 1:
            section_content = content[end:section_headers[i+1][0]].strip()
        else:
            section_content = content[end:].strip()
        
        # Process the section content based on the section type
        if section == "QUESTIONS AND ANSWERS":
            sections[section] = process_questions_answers(section_content)
        elif section == "CONTEXT":
            # For context, we want a single string - remove bullet points and hyphens
            clean_content = section_content
            # If the content starts with bullet points or hyphens, remove them
            lines = []
            for line in clean_content.split('\n'):
                # Clean the text
                line = clean_text(line)
                if line:
                    lines.append(line)
            
            sections[section] = ['\n'.join(lines)]
        elif section in ["TYPE", "MEETING TYPE"]:
            # For meeting type, we want a single string
            meeting_type = clean_text(section_content)
            sections["TYPE"] = meeting_type
        else:
            # For other sections, split by lines and filter out empty lines
            # Also remove bullet points, hyphens, and asterisks from the beginning of each line
            lines = []
            for line in section_content.split('\n'):
                line = line.strip()
                if line:
                    # Clean the text
                    line = clean_text(line)
                    if line:  # Only add if still non-empty after cleaning
                        lines.append(line)
            
            sections[section] = lines
    
    # Debug log the sections found
    for section_name, section_content in sections.items():
        logger.info(f"Found section {section_name} with {len(section_content) if isinstance(section_content, list) else 1} items")
        if section_content:
            if isinstance(section_content, list) and section_content:
                logger.info(f"First item: {section_content[0][:100]}...")
            else:
                logger.info(f"Content: {str(section_content)[:100]}...")
    
    return sections

def process_questions_answers(content):
    """Process the Q&A section to extract Q&A pairs with standardized format"""
    # Remove everything after and including "====" if present
    if "====" in content:
        content = content.split("====")[0].strip()
    
    qa_items = []
    
    # First, try to find multi-question format with ** separator
    # This pattern looks for questions ending with ? followed by ** and then an answer
    multi_qa_pattern = r'(?:^|\n)\s*(?:\d+\.\s*)?(?:Q:?\s*)?([^?]*?\?)\s*\*\*\s*(.*?)(?=(?:\n\s*(?:\d+\.\s*)?(?:Q:?\s*)?[^?]*?\?\s*\*\*|\Z))'
    multi_qa_matches = re.finditer(multi_qa_pattern, content, re.DOTALL)
    
    multi_qa_found = False
    for qa_match in multi_qa_matches:
        multi_qa_found = True
        question = qa_match.group(1).strip()
        answer = qa_match.group(2).strip() if qa_match.group(2) else ""
        
        # Clean up the question - remove any redundant "Q:" prefixes, numbering, and **
        question = re.sub(r'^(\d+\.\s*)?Q:?\s*', '', question)
        question = question.replace('**', '')
        
        # Clean up the answer - ensure it starts with "A: " and remove redundant "Answer:" prefix
        answer = re.sub(r'^\s*\*\*\s*', '', answer)  # Remove leading **
        answer = re.sub(r'^A:\s*Answer:\s*', 'A: ', answer)  # Replace "A: Answer:" with "A: "
        answer = re.sub(r'^Answer:\s*', 'A: ', answer)  # Replace "Answer:" with "A: "
        if not answer.startswith('A:'):
            answer = f"A: {answer}"
        
        # Store in standardized format
        qa_items.append(f"Q: {question}\n{answer}")
    
    if multi_qa_found:
        return qa_items
    
    # If no multi-question format found, try to find structured Q&A pairs with "Q:" and "A:" prefixes
    qa_pattern = r"(?:^|\n)\s*(?:\d+\.\s*)?(?:\*\*)?Q(?:\*\*)?\s*:?\s*(.*?)(?:\n\s*(?:\*\*)?A(?:\*\*)?\s*:?\s*(.*?)(?=(?:\n\s*(?:\d+\.\s*)?(?:\*\*)?Q(?:\*\*)?\s*:?|\Z)))"
    qa_matches = re.finditer(qa_pattern, content, re.DOTALL)
    
    qa_found = False
    for qa_match in qa_matches:
        qa_found = True
        question = qa_match.group(1).strip()
        answer = qa_match.group(2).strip() if qa_match.group(2) else ""
        
        # Clean up the question - remove any redundant "Q:" prefixes, numbering, and **
        question = re.sub(r'^(\d+\.\s*)?Q:?\s*', '', question)
        question = question.replace('**', '')
        
        # Clean up the answer - ensure it starts with "A: " and remove redundant "Answer:" prefix
        answer = re.sub(r'^\s*\*\*\s*', '', answer)  # Remove leading **
        answer = answer.replace('**', '')  # Remove any ** in the answer
        answer = re.sub(r'^A:\s*Answer:\s*', 'A: ', answer)  # Replace "A: Answer:" with "A: "
        answer = re.sub(r'^Answer:\s*', 'A: ', answer)  # Replace "Answer:" with "A: "
        if not answer.startswith('A:'):
            answer = f"A: {answer}"
        
        # Store in standardized format
        qa_items.append(f"Q: {question}\n{answer}")
    
    if qa_found:
        return qa_items
    
    # If no structured Q&A pairs found, try to parse the content by looking for lines that might be questions
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Remove any numbering, asterisks, or bullet points
        clean_line = re.sub(r'^\s*(?:\d+\.\s*)?(?:Q:?\s*)?', '', re.sub(r'^\s*(?:\d+\.\s*|\*\*|\*|\•|\-)\s*', '', line))
        clean_line = clean_line.replace('**', '')  # Remove any ** in the question
        
        # If this line looks like a question (ends with ?)
        if clean_line and clean_line.endswith('?'):
            question = clean_line
            answer = ""
            
            # Look for the answer in subsequent lines until we find another question or run out of lines
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                clean_next_line = re.sub(r'^\s*(?:\d+\.\s*|\*\*|\*|\•|\-)\s*', '', next_line)
                clean_next_line = clean_next_line.replace('**', '')  # Remove any ** in the answer
                
                # If we find another question, stop collecting the answer
                if clean_next_line.endswith('?') and (re.match(r'^\s*(?:\d+\.\s*)?Q:?\s*', next_line) or 
                                                     j == len(lines) - 1 or 
                                                     not re.match(r'^\s*A:?\s*', lines[j+1].strip() if j+1 < len(lines) else '')):
                    break
                
                if next_line:
                    # If this line starts with A:, it's definitely an answer
                    if re.match(r'^\s*(?:\d+\.\s*)?A:?\s*', next_line):
                        answer_text = re.sub(r'^\s*(?:\d+\.\s*)?A:?\s*', '', next_line)
                        answer_text = answer_text.replace('**', '')  # Remove any ** in the answer
                        answer_text = re.sub(r'^Answer:\s*', '', answer_text)  # Remove redundant "Answer:" prefix
                        if answer:
                            answer += " " + answer_text
                        else:
                            answer = answer_text
                    else:
                        # Otherwise, add it to the answer if it doesn't look like a new question
                        if answer:
                            answer += " " + clean_next_line
                        else:
                            answer = clean_next_line
                j += 1
            
            # Ensure answer starts with "A: " and remove redundant "Answer:" prefix
            answer = re.sub(r'^A:\s*Answer:\s*', 'A: ', answer)  # Replace "A: Answer:" with "A: "
            answer = re.sub(r'^Answer:\s*', 'A: ', answer)  # Replace "Answer:" with "A: "
            if not answer.startswith('A:'):
                answer = f"A: {answer}"
            
            qa_items.append(f"Q: {question}\n{answer}")
            i = j - 1  # Move to the last line of this answer
        
        i += 1
    
    if qa_items:
        return qa_items
    
    # If still no Q&A pairs found, try one more approach - look for ** as separators
    if "**" in content:
        parts = content.split("**")
        for i in range(0, len(parts) - 1, 2):
            if i + 1 < len(parts):
                question_part = parts[i].strip()
                answer_part = parts[i + 1].strip()
                
                # Clean up the question - remove any ** and redundant prefixes
                question_part = question_part.replace('**', '')
                
                # Check if the question part ends with a question mark
                if question_part.endswith('?'):
                    # Clean up the question - remove any redundant "Q:" prefixes and numbering
                    question = re.sub(r'^(\d+\.\s*)?Q:?\s*', '', question_part)
                    
                    # Clean up the answer - ensure it starts with "A: " and remove redundant "Answer:" prefix
                    answer_part = answer_part.replace('**', '')  # Remove any ** in the answer
                    answer_part = re.sub(r'^A:\s*Answer:\s*', 'A: ', answer_part)  # Replace "A: Answer:" with "A: "
                    answer_part = re.sub(r'^Answer:\s*', 'A: ', answer_part)  # Replace "Answer:" with "A: "
                    if not answer_part.startswith('A:'):
                        answer_part = f"A: {answer_part}"
                    
                    qa_items.append(f"Q: {question}\n{answer_part}")
    
    if qa_items:
        return qa_items
    
    # If still no Q&A pairs found, return the whole section as one item
    # Remove bullet points, hyphens, and asterisks from the beginning of each line
    clean_lines = []
    for line in content.split('\n'):
        line = line.strip()
        if line:
            line = clean_text(line)
            if line:  # Only add if still non-empty after cleaning
                clean_lines.append(line)
    
    # If there's at least one line that ends with a question mark, try to parse it as a Q&A
    for i, line in enumerate(clean_lines):
        if line.endswith('?'):
            question = line
            answer = " ".join(clean_lines[i+1:]) if i+1 < len(clean_lines) else ""
            
            # Clean up the answer - ensure it starts with "A: " and remove redundant "Answer:" prefix
            answer = re.sub(r'^A:\s*Answer:\s*', 'A: ', answer)  # Replace "A: Answer:" with "A: "
            answer = re.sub(r'^Answer:\s*', 'A: ', answer)  # Replace "Answer:" with "A: "
            if not answer.startswith('A:'):
                answer = f"A: {answer}"
            
            qa_items.append(f"Q: {question}\n{answer}")
            return qa_items
    
    # Last resort - just return the whole content
    return ['\n'.join(clean_lines)]

def lambda_handler(event, context):
    """
    Lambda function to process summary files from S3 and saves to DynamoDB.
    Can be triggered by S3 events or run manually.
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Get the bucket name and key from the event or environment variables
        bucket_name = os.environ.get('BUCKET_NAME')
        keys_to_process = []
        
        # Check if this is an S3 event
        if 'Records' in event and event['Records'][0].get('eventSource') == 'aws:s3':
            s3_event = event['Records'][0]['s3']
            bucket_name = s3_event['bucket']['name']
            key = s3_event['object']['key']
            keys_to_process = [key]
            logger.info(f"Processing S3 event for key: {key}")
        elif 'detail' in event and 'bucket' in event['detail'] and 'object' in event['detail']:
            # Handle EventBridge event format
            bucket_name = event['detail']['bucket']['name']
            key = event['detail']['object']['key']
            keys_to_process = [key]
            logger.info(f"Processing EventBridge event for key: {key}")
        else:
            # Manual invocation - only if explicitly requested
            if event.get('processAllFiles') == True:
                if not bucket_name:
                    bucket_name = event.get('bucket')
                
                if not bucket_name:
                    raise ValueError("Bucket name not provided in event or environment variables")
                
                # List all summary files
                response = s3.list_objects_v2(
                    Bucket=bucket_name,
                    Prefix='summaries/'
                )
                
                keys_to_process = [obj['Key'] for obj in response.get('Contents', []) 
                                if obj['Key'].endswith('.txt') and not obj['Key'].endswith('-metadata.txt')]
                logger.info(f"Processing all files in summaries/ prefix: {len(keys_to_process)} files")
            else:
                logger.info("No specific file to process and processAllFiles not set to true")
                return {
                    'statusCode': 400,
                    'body': {
                        'message': 'No specific file to process and processAllFiles not set to true'
                    }
                }
        
        # Get the DynamoDB tables
        summaries_table_name = os.environ.get('SUMMARIES_TABLE', 'MeetingSummaries')
        summaries_table = dynamodb.Table(summaries_table_name)
        
        stats_table_name = os.environ.get('STATISTICS_TABLE', 'MeetingStatistics')
        stats_table = dynamodb.Table(stats_table_name)
        
        processed_count = 0
        for key in keys_to_process:
            try:
                # Skip if not a summary file
                if not key.endswith('.txt') or key.endswith('-metadata.txt'):
                    logger.info(f"Skipping non-summary file: {key}")
                    continue
                
                logger.info(f"Processing summary file: {key}")
                
                # Get the summary file
                summary_obj = s3.get_object(Bucket=bucket_name, Key=key)
                summary_content = summary_obj['Body'].read().decode('utf-8')
                
                # Log the content for debugging
                logger.info(f"Summary content (first 200 chars): {summary_content[:200]}...")
                
                # Extract file information
                file_name = key.split('/')[-1]
                base_name = file_name.split('-summary.txt')[0] if '-summary.txt' in file_name else file_name.split('.txt')[0]
                
                # Try to find metadata file
                metadata = {}
                metadata_key = key.replace('.txt', '-metadata.json')
                try:
                    metadata_obj = s3.get_object(Bucket=bucket_name, Key=metadata_key)
                    metadata = json.loads(metadata_obj['Body'].read().decode('utf-8'))
                    logger.info(f"Found metadata file: {metadata_key}")
                except Exception as e:
                    logger.warning(f"Metadata file not found for {key}: {str(e)}")
                
                # Generate a unique ID if not present in metadata
                meeting_id = metadata.get('meetingId', str(uuid.uuid4()))
                
                # Check if this meeting ID already exists in DynamoDB
                try:
                    # Check if a record with the same fileKey already exists
                    response = summaries_table.scan(
                        FilterExpression="fileKey = :fileKey",
                        ExpressionAttributeValues={':fileKey': key},
                        ProjectionExpression="id"
                    )
                    
                    if response.get('Items'):
                        logger.info(f"Record for file {key} already exists in DynamoDB, skipping")
                        continue
                except Exception as e:
                    logger.warning(f"Error checking for existing item: {str(e)}")
                
                # Extract all sections using the simpler approach
                sections = extract_sections(summary_content)
                
                # Extract meeting type
                meeting_type = sections.get("TYPE", extract_meeting_type(summary_content))
                
                # Create the DynamoDB item
                # Use local timestamp if available, otherwise use server time
                server_timestamp = datetime.utcnow().isoformat()
                local_timestamp = metadata.get('localTimestamp', server_timestamp)
                
                # Extract title from the TITLE section if available, otherwise use metadata or filename
                title = None
                if 'TITLE' in sections and sections['TITLE']:
                    # If TITLE section exists and has content
                    if isinstance(sections['TITLE'], list) and sections['TITLE']:
                        title = sections['TITLE'][0]  # Take the first line as the title
                    elif isinstance(sections['TITLE'], str):
                        title = sections['TITLE']
                
                # If no title found in the TITLE section, fall back to metadata or filename
                if not title:
                    title = metadata.get('title', extract_title_from_filename(base_name))
                
                # Clean the title
                title = clean_text(title)
                
                # Filter out empty values from all array fields
                stakeholders = filter_empty_values(sections.get('STAKEHOLDERS', []))
                objectives = filter_empty_values(sections.get('MEETING OBJECTIVES', []))
                conversation_details = filter_empty_values(sections.get('CONVERSATION DETAILS', []))
                key_points = filter_empty_values(sections.get('KEY POINTS DISCUSSED', []))
                action_items = filter_empty_values(sections.get('ACTION ITEMS & NEXT STEPS', []))
                additional_notes = filter_empty_values(sections.get('ADDITIONAL NOTES', []))
                technical_requirements = filter_empty_values(sections.get('TECHNICAL REQUIREMENTS & RESOURCES', []))
                timeline = filter_empty_values(sections.get('TIMELINE & MILESTONES', []))
                budget = filter_empty_values(sections.get('BUDGET CONSIDERATIONS', []))
                blockers = filter_empty_values(sections.get('BLOCKERS & CHALLENGES', []))
                agreements = filter_empty_values(sections.get('AGREEMENTS & COMMITMENTS', []))
                communication_plan = filter_empty_values(sections.get('COMMUNICATION PLAN', []))
                follow_up = filter_empty_values(sections.get('FOLLOW-UP REQUIREMENTS', []))
                questions_answers = filter_empty_values(sections.get('QUESTIONS AND ANSWERS', []))
                
                # Clean the context text
                context = sections.get('CONTEXT', [""])[0]
                if context:
                    context = clean_text(context)
                
                item = {
                    'id': meeting_id,  # Using 'id' as the hash key based on the table schema
                    'title': title,
                    'date': metadata.get('date', local_timestamp),  # Use local timestamp here
                    'stakeholders': stakeholders,
                    'context': context,  # Context is a single string
                    'objectives': objectives,
                    'conversationDetails': conversation_details,
                    'keyPoints': key_points,
                    'actionItems': action_items,
                    'additionalNotes': additional_notes,
                    'technicalRequirements': technical_requirements,
                    'timeline': timeline,
                    'budget': budget,
                    'blockers': blockers,
                    'agreements': agreements,
                    'communicationPlan': communication_plan,
                    'followUp': follow_up,
                    'questionsAnswers': questions_answers,
                    'meetingType': meeting_type,  # Add meeting type
                    'fileKey': key,
                    'createdAt': local_timestamp,  # Use local timestamp here
                    'updatedAt': local_timestamp   # Use local timestamp here
                }
                
                # Calculate estimated duration based on content length
                total_content = 0
                for field in ['context', 'objectives', 'conversationDetails', 'keyPoints']:
                    if field in item:
                        content = item[field]
                        if isinstance(content, str):
                            total_content += len(content)
                        elif isinstance(content, list):
                            total_content += sum(len(str(item_content)) for item_content in content if item_content)
                
                # Rough estimate: 1000 characters ≈ 5 minutes of meeting time
                estimated_minutes = max(15, total_content // 200)  # Minimum 15 minutes
                
                # Add duration to the item
                item['duration'] = estimated_minutes
                
                # Log the item for debugging
                logger.info(f"DynamoDB item to save: {json.dumps(item, cls=DecimalEncoder)}")
                
                # Save to MeetingSummaries table
                summaries_table.put_item(Item=item)
                logger.info(f"Saved summary to DynamoDB with ID: {meeting_id}")
                
                # Update the MeetingStatistics table
                try:
                    # First, try to find a record with the same MeetingId using the GSI
                    logger.info(f"Searching for existing record with MeetingId: {meeting_id}")
                    stats_response = stats_table.query(
                        IndexName="MeetingId-index",
                        KeyConditionExpression=boto3.dynamodb.conditions.Key("MeetingId").eq(meeting_id),
                        Limit=1
                    )
                    
                    logger.info(f"Query response: {json.dumps(stats_response, cls=DecimalEncoder)}")
                    
                    existing_stats_record = None
                    if stats_response.get("Items") and len(stats_response["Items"]) > 0:
                        existing_stats_record = stats_response["Items"][0]
                        logger.info(f"Found existing statistics record by MeetingId: {existing_stats_record['id']}")
                    
                    # If not found by MeetingId, try to find by base name
                    if not existing_stats_record:
                        logger.info(f"No record found by MeetingId, trying title similarity with base_name: {base_name}")
                        # Scan for records with matching title or similar attributes
                        scan_response = stats_table.scan(
                            FilterExpression=boto3.dynamodb.conditions.Attr("title").contains(base_name)
                        )
                        
                        logger.info(f"Scan response: {json.dumps(scan_response, cls=DecimalEncoder)}")
                        
                        if scan_response.get("Items") and len(scan_response["Items"]) > 0:
                            existing_stats_record = scan_response["Items"][0]
                            logger.info(f"Found existing statistics record by title similarity: {existing_stats_record['id']}")
                        
                    # If still not found, try to find by looking for records created around the same time
                    if not existing_stats_record:
                        logger.info("No record found by title similarity, trying to find by recent creation time")
                        # Get all records and sort by creation time
                        all_records_response = stats_table.scan()
                        all_records = all_records_response.get("Items", [])
                        
                        # Continue scanning if we haven't retrieved all items
                        while "LastEvaluatedKey" in all_records_response:
                            all_records_response = stats_table.scan(ExclusiveStartKey=all_records_response["LastEvaluatedKey"])
                            all_records.extend(all_records_response.get("Items", []))
                        
                        # Sort by creation time (newest first)
                        all_records.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
                        
                        # Take the most recently created record
                        if all_records:
                            existing_stats_record = all_records[0]
                            logger.info(f"Found most recent statistics record: {existing_stats_record['id']}")
                            
                            # Check if it was created within the last 5 minutes
                            if "createdAt" in existing_stats_record:
                                created_at = existing_stats_record["createdAt"]
                                try:
                                    created_time = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                                    current_time = datetime.fromisoformat(local_timestamp.replace("Z", "+00:00"))
                                    time_diff = (current_time - created_time).total_seconds()
                                    
                                    if time_diff > 300:  # More than 5 minutes old
                                        logger.info(f"Most recent record is too old ({time_diff} seconds), not using it")
                                        existing_stats_record = None
                                except Exception as time_error:
                                    logger.warning(f"Error calculating time difference: {str(time_error)}")
                                    # Continue with the record anyway
                    
                    if existing_stats_record:
                        # Add detailed logging to debug the issue
                        logger.info(f"Existing record found: {json.dumps(existing_stats_record, cls=DecimalEncoder)}")
                        logger.info(f"Updating with meeting type: {meeting_type} and title: {title}")
                        
                        # Update the existing record with meeting type and title
                        try:
                            update_response = stats_table.update_item(
                                Key={'id': existing_stats_record['id']},
                                UpdateExpression="set meetingType = :t, title = :title, updatedAt = :u",
                                ExpressionAttributeValues={
                                    ':t': meeting_type,
                                    ':title': title,
                                    ':u': local_timestamp
                                },
                                ReturnValues="UPDATED_NEW"
                            )
                            logger.info(f"Update response: {json.dumps(update_response, cls=DecimalEncoder)}")
                            logger.info(f"Updated existing statistics record {existing_stats_record['id']} with meeting type: {meeting_type}")
                        except Exception as update_error:
                            logger.error(f"Error during update_item operation: {str(update_error)}")
                            raise update_error
                    else:
                        # No existing record found, create a minimal one with just the essential fields
                        # This should be rare since ExtractMeetingStatisticsFunction should have created one already
                        stats_table.put_item(Item={
                            'id': meeting_id,
                            'MeetingId': meeting_id,
                            'title': title,
                            'date': local_timestamp,
                            'duration': estimated_minutes,
                            'meetingType': meeting_type,
                            'createdAt': local_timestamp,
                            'updatedAt': local_timestamp
                        })
                        logger.info(f"Created new statistics record with ID: {meeting_id} and meeting type: {meeting_type}")
                    
                except Exception as e:
                    logger.error(f"Error updating meeting statistics: {str(e)}")
                
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Error processing summary file {key}: {str(e)}")
        
        return {
            'statusCode': 200,
            'body': {
                'message': f'Successfully processed {processed_count} summary files',
                'processedCount': processed_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error processing summaries: {str(e)}")
        return {
            'statusCode': 500,
            'body': {
                'error': f"Failed to process summaries: {str(e)}"
            }
        }
