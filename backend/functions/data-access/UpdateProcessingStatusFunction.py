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

# Processing status constants
PROCESSING_STATUSES = {
    'UPLOADED': 'UPLOADED',
    'TRANSCRIBING': 'TRANSCRIBING', 
    'TRANSCRIPTION_COMPLETE': 'TRANSCRIPTION_COMPLETE',
    'SUMMARIZING': 'SUMMARIZING',
    'COMPLETE': 'COMPLETE',
    'FAILED': 'FAILED'
}

# Stage descriptions for user-friendly display
STAGE_DESCRIPTIONS = {
    'UPLOADED': 'File uploaded successfully',
    'TRANSCRIBING': 'Converting speech to text',
    'TRANSCRIPTION_COMPLETE': 'Transcription completed',
    'SUMMARIZING': 'Generating meeting summary',
    'COMPLETE': 'Processing complete',
    'FAILED': 'Processing failed'
}

# Progress percentages for each stage
PROGRESS_PERCENTAGES = {
    'UPLOADED': 10,
    'TRANSCRIBING': 30,
    'TRANSCRIPTION_COMPLETE': 60,
    'SUMMARIZING': 80,
    'COMPLETE': 100,
    'FAILED': 0
}

def lambda_handler(event, context):
    """
    Update processing status for a file
    This function is called by other Lambda functions to update status
    """
    try:
        # Extract parameters from the event
        file_id = event.get('file_id')
        user_id = event.get('user_id')
        status = event.get('status')
        error_message = event.get('error_message')
        file_name = event.get('file_name', '')
        
        if not file_id or not user_id or not status:
            logger.error("Missing required parameters: file_id, user_id, or status")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required parameters'})
            }
        
        if status not in PROCESSING_STATUSES:
            logger.error(f"Invalid status: {status}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid status'})
            }
        
        return update_processing_status(file_id, user_id, status, error_message, file_name)
        
    except Exception as e:
        logger.error(f"Error in UpdateProcessingStatusFunction: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }

def update_processing_status(file_id, user_id, status, error_message=None, file_name=''):
    """Update the processing status in DynamoDB"""
    try:
        current_time = datetime.utcnow().isoformat()
        
        logger.info(f"🔄 Updating processing status: file_id={file_id}, user_id={user_id}, status={status}, file_name={file_name}")
        
        # Prepare the item to update
        update_expression = "SET #status = :status, #stage = :stage, #progress = :progress, #updated_at = :updated_at"
        expression_attribute_names = {
            '#status': 'status',
            '#stage': 'stage', 
            '#progress': 'progress_percentage',
            '#updated_at': 'updated_at'
        }
        expression_attribute_values = {
            ':status': status,
            ':stage': STAGE_DESCRIPTIONS.get(status, status),
            ':progress': PROGRESS_PERCENTAGES.get(status, 0),
            ':updated_at': current_time
        }
        
        # Add error message if provided
        if error_message:
            update_expression += ", #error_message = :error_message"
            expression_attribute_names['#error_message'] = 'error_message'
            expression_attribute_values[':error_message'] = error_message
        
        # Add file name if this is the initial upload
        if status == 'UPLOADED' and file_name:
            update_expression += ", #file_name = :file_name, #created_at = :created_at"
            expression_attribute_names['#file_name'] = 'file_name'
            expression_attribute_names['#created_at'] = 'created_at'
            expression_attribute_values[':file_name'] = file_name
            expression_attribute_values[':created_at'] = current_time
        
        logger.info(f"📝 DynamoDB update expression: {update_expression}")
        logger.info(f"📝 DynamoDB values: {expression_attribute_values}")
        
        # Update the item in DynamoDB
        response = processing_status_table.update_item(
            Key={
                'file_id': file_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW'
        )
        
        # If this is a new item (UPLOADED status), also set user_id
        if status == 'UPLOADED':
            logger.info(f"📝 Setting user_id for new UPLOADED item: {user_id}")
            processing_status_table.update_item(
                Key={'file_id': file_id},
                UpdateExpression="SET user_id = :user_id",
                ExpressionAttributeValues={':user_id': user_id}
            )
        
        logger.info(f"✅ Successfully updated processing status for file {file_id} to {status}")
        logger.info(f"📊 Updated item: {response.get('Attributes', {})}")
        
        # If status is COMPLETE, wait a few seconds then delete the record
        if status == 'COMPLETE':
            logger.info(f"🗑️ Status is COMPLETE - will delete record for file {file_id} after 6 seconds")
            
            # Wait 6 seconds to allow frontend to:
            # 1. Show completion status (2-3 seconds)
            # 2. Trigger refresh of summaries (3-4 seconds)
            import time
            time.sleep(6)
            
            try:
                # Delete the record after the delay
                delete_response = processing_status_table.delete_item(
                    Key={
                        'file_id': file_id
                    },
                    ReturnValues='ALL_OLD'
                )
                
                deleted_item = delete_response.get('Attributes', {})
                if deleted_item:
                    logger.info(f"🗑️ Successfully deleted completed record for file {file_id} after delay")
                else:
                    logger.warning(f"⚠️ No record found to delete for file {file_id}")
                    
            except Exception as delete_error:
                logger.error(f"Failed to delete completed record for file {file_id}: {str(delete_error)}")
                # Don't fail the main operation if deletion fails
        
        # Return the updated item
        updated_item = response.get('Attributes', {})
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Processing status updated successfully',
                'status': updated_item
            })
        }
        
    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Database error'})
        }

def create_initial_status(file_id, user_id, file_name=''):
    """Create initial processing status entry"""
    return update_processing_status(file_id, user_id, 'UPLOADED', None, file_name)

def mark_as_failed(file_id, user_id, error_message):
    """Mark processing as failed with error message"""
    return update_processing_status(file_id, user_id, 'FAILED', error_message)
