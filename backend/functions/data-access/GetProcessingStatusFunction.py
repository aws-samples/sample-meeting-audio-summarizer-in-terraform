import json
import boto3
import os
import logging
from datetime import datetime
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
processing_status_table = dynamodb.Table(os.environ['PROCESSING_STATUS_TABLE_NAME'])

def lambda_handler(event, context):
    """
    Get processing status for a specific file or list all processing statuses for a user
    """
    try:
        # Extract parameters from the event
        file_id = event.get('arguments', {}).get('fileId')
        user_id = event.get('identity', {}).get('sub')
        
        if not user_id:
            logger.error("User ID not found in event identity")
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        if file_id:
            # Get specific file processing status
            return get_file_processing_status(file_id, user_id)
        else:
            # List all processing statuses for the user
            return list_user_processing_statuses(user_id)
            
    except Exception as e:
        logger.error(f"Error in GetProcessingStatusFunction: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }

def get_file_processing_status(file_id, user_id):
    """Get processing status for a specific file"""
    try:
        response = processing_status_table.get_item(
            Key={'file_id': file_id}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Processing status not found'})
            }
        
        item = response['Item']
        
        # Verify the file belongs to the requesting user
        if item.get('user_id') != user_id:
            return {
                'statusCode': 403,
                'body': json.dumps({'error': 'Access denied'})
            }
        
        # Format the response
        processing_status = {
            'fileId': item['file_id'],
            'userId': item['user_id'],
            'status': item['status'],
            'stage': item.get('stage', ''),
            'progressPercentage': item.get('progress_percentage', 0),
            'errorMessage': item.get('error_message'),
            'fileName': item.get('file_name', ''),
            'createdAt': item['created_at'],
            'updatedAt': item.get('updated_at', item['created_at'])
        }
        
        return processing_status
        
    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Database error'})
        }

def list_user_processing_statuses(user_id):
    """List all processing statuses for a user - excluding most completed ones"""
    try:
        logger.info(f"🔍 Querying processing statuses for user: {user_id}")
        
        response = processing_status_table.query(
            IndexName='UserIndex',
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={
                ':user_id': user_id
            },
            ScanIndexForward=False,  # Sort by created_at descending
            Limit=50  # Limit to recent 50 items
        )
        
        all_items = response.get('Items', [])
        logger.info(f"📊 Found {len(all_items)} total processing records for user {user_id}")
        
        # Log all items before filtering
        for item in all_items:
            logger.info(f"  - Raw item: {item.get('file_name', 'Unknown')}: {item['status']} (created: {item.get('created_at', 'N/A')}, updated: {item.get('updated_at', 'N/A')})")
        
        # Simple approach: Filter out completed processes older than 5 minutes
        from datetime import datetime, timedelta
        
        five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
        logger.info(f"Filtering COMPLETE processes older than: {five_minutes_ago.isoformat()}")
        
        filtered_items = []
        for item in all_items:
            if item['status'] == 'COMPLETE':
                try:
                    # Get the most recent timestamp
                    updated_at_str = item.get('updated_at', item.get('created_at', ''))
                    
                    # Simple parsing - just remove Z and microseconds
                    if updated_at_str:
                        # Remove microseconds and Z
                        clean_time = updated_at_str.split('.')[0].replace('Z', '')
                        updated_at = datetime.fromisoformat(clean_time)
                        
                        if updated_at > five_minutes_ago:
                            filtered_items.append(item)
                            logger.info(f"✅ Keeping very recent COMPLETE process: {item.get('file_name', item['file_id'])} ({updated_at_str})")
                        else:
                            logger.info(f"🧹 Filtering out old COMPLETE process: {item.get('file_name', item['file_id'])} ({updated_at_str})")
                    else:
                        logger.info(f"🧹 Filtering out COMPLETE process with no timestamp: {item['file_id']}")
                        
                except Exception as e:
                    logger.error(f"Error parsing datetime for {item['file_id']}: {e}")
                    # If we can't parse the date, filter it out
                    logger.info(f"🧹 Filtering out COMPLETE process with unparseable date: {item['file_id']}")
            elif item['status'] == 'FAILED':
                # Keep failed processes visible for a short time so users can see what failed
                try:
                    updated_at_str = item.get('updated_at', item.get('created_at', ''))
                    if updated_at_str:
                        clean_time = updated_at_str.split('.')[0].replace('Z', '')
                        updated_at = datetime.fromisoformat(clean_time)
                        
                        # Keep failed processes for 10 minutes
                        ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
                        if updated_at > ten_minutes_ago:
                            filtered_items.append(item)
                            logger.info(f"✅ Keeping recent FAILED process: {item.get('file_name', item['file_id'])} ({updated_at_str})")
                        else:
                            logger.info(f"🧹 Filtering out old FAILED process: {item.get('file_name', item['file_id'])} ({updated_at_str})")
                    else:
                        logger.info(f"🧹 Filtering out FAILED process with no timestamp: {item['file_id']}")
                except Exception as e:
                    logger.error(f"Error parsing datetime for failed process {item['file_id']}: {e}")
                    # Keep failed processes if we can't parse the date
                    filtered_items.append(item)
            else:
                # Keep all non-complete, non-failed processes (UPLOADED, TRANSCRIBING, SUMMARIZING, etc.)
                filtered_items.append(item)
                logger.info(f"✅ Keeping {item['status']} process: {item.get('file_name', item['file_id'])}")
        
        logger.info(f"Filtered to {len(filtered_items)} items after removing old completed processes")
        
        # Format the response
        processing_statuses = []
        for item in filtered_items:
            processing_status = {
                'fileId': item['file_id'],
                'userId': item['user_id'],
                'status': item['status'],
                'stage': item.get('stage', ''),
                'progressPercentage': item.get('progress_percentage', 0),
                'errorMessage': item.get('error_message'),
                'fileName': item.get('file_name', ''),
                'createdAt': item['created_at'],
                'updatedAt': item.get('updated_at', item['created_at'])
            }
            processing_statuses.append(processing_status)
        
        # Log what we're returning
        logger.info(f"📊 Returning {len(processing_statuses)} processes to frontend:")
        for status in processing_statuses:
            logger.info(f"  - {status.get('fileName', 'Unknown')}: {status['status']} ({status.get('progressPercentage', 0)}%)")
        
        return processing_statuses
        
    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Database error'})
        }
