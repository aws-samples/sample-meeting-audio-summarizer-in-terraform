import json
import boto3
import os
import logging
from boto3.dynamodb.conditions import Key

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Check if this is a single deletion or multiple deletion
        if 'id' in event.get('arguments', {}):
            # Single deletion
            summary_id = event['arguments']['id']
            
            # Get DynamoDB table name
            table_name = os.environ.get('DYNAMODB_TABLE', 'MeetingSummaries')
            table = dynamodb.Table(table_name)
            
            # Get S3 bucket name
            bucket_name = os.environ.get('BUCKET_NAME')
            
            try:
                # Get the summary to find associated S3 objects
                response = table.get_item(Key={'id': summary_id})
                
                if 'Item' in response:
                    summary = response['Item']
                    
                    # Delete associated S3 objects if they exist
                    if bucket_name:
                        # Delete summary file if it exists
                        if 'fileKey' in summary:
                            try:
                                s3.delete_object(
                                    Bucket=bucket_name,
                                    Key=summary['fileKey']
                                )
                                logger.info(f"Deleted S3 object: {summary['fileKey']}")
                            except Exception as e:
                                logger.error(f"Error deleting S3 object {summary['fileKey']}: {str(e)}")
                    
                    # Delete from DynamoDB
                    table.delete_item(Key={'id': summary_id})
                    
                    logger.info(f"Successfully deleted summary: {summary_id}")
                    
                    return {
                        'success': True,
                        'message': f"Successfully deleted summary {summary_id}",
                        'deletedId': summary_id
                    }
                else:
                    logger.warning(f"Summary not found: {summary_id}")
                    return {
                        'success': False,
                        'message': f"Summary not found: {summary_id}",
                        'deletedId': None
                    }
            
            except Exception as e:
                logger.error(f"Error deleting summary {summary_id}: {str(e)}")
                return {
                    'success': False,
                    'message': f"Error deleting summary: {str(e)}",
                    'deletedId': None
                }
        
        # Multiple deletion
        summary_ids = event.get('arguments', {}).get('ids', [])
        
        if not summary_ids:
            return {
                'success': False,
                'message': 'No summary IDs provided',
                'deletedIds': [],
                'failedIds': []
            }
        table_name = os.environ.get('DYNAMODB_TABLE', 'MeetingSummaries')
        table = dynamodb.Table(table_name)
        
        # Get S3 bucket name
        bucket_name = os.environ.get('BUCKET_NAME')
        
        deleted_ids = []
        failed_ids = []
        
        # Delete each summary
        for summary_id in summary_ids:
            try:
                # Get the summary to find associated S3 objects
                response = table.get_item(Key={'id': summary_id})
                
                if 'Item' in response:
                    summary = response['Item']
                    
                    # Delete associated S3 objects if they exist
                    if bucket_name:
                        # Delete summary file if it exists
                        if 'fileKey' in summary:
                            try:
                                s3.delete_object(
                                    Bucket=bucket_name,
                                    Key=summary['fileKey']
                                )
                                logger.info(f"Deleted S3 object: {summary['fileKey']}")
                            except Exception as e:
                                logger.error(f"Error deleting S3 object {summary['fileKey']}: {str(e)}")
                    
                    # Delete from DynamoDB
                    table.delete_item(Key={'id': summary_id})
                    
                    deleted_ids.append(summary_id)
                    logger.info(f"Successfully deleted summary: {summary_id}")
                else:
                    failed_ids.append(summary_id)
                    logger.warning(f"Summary not found: {summary_id}")
            
            except Exception as e:
                failed_ids.append(summary_id)
                logger.error(f"Error deleting summary {summary_id}: {str(e)}")
        
        # Return response
        if len(deleted_ids) > 0:
            return {
                'success': True,
                'message': f"Successfully deleted {len(deleted_ids)} summaries",
                'deletedIds': deleted_ids,
                'failedIds': failed_ids
            }
        else:
            # Handle case where no summaries were deleted
            if len(failed_ids) > 0:
                return {
                    'success': False,
                    'message': f"Failed to delete {len(failed_ids)} summaries - they may not exist or have already been deleted",
                    'deletedIds': deleted_ids,
                    'failedIds': failed_ids
                }
            else:
                return {
                    'success': False,
                    'message': "No summaries were found to delete",
                    'deletedIds': deleted_ids,
                    'failedIds': failed_ids
                }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'success': False,
            'message': f"Error processing request: {str(e)}",
            'deletedIds': [],
            'failedIds': summary_ids if 'summary_ids' in locals() else []
        }
