import boto3
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Lambda function triggered after a user confirms their account.
    This function adds the user to the 'app_users' group automatically.
    """
    # Log the event
    logger.info(f"Post confirmation event: {event}")
    
    # Get the user pool ID and username from the event
    user_pool_id = event['userPoolId']
    username = event['userName']
    
    # Initialize Cognito client
    cognito = boto3.client('cognito-idp')
    
    try:
        # Add the user to the app_users group
        cognito.admin_add_user_to_group(
            UserPoolId=user_pool_id,
            Username=username,
            GroupName="app_users"
        )
        logger.info(f"Successfully added user {username} to app_users group")
        
        # Return the event to continue the flow
        return event
        
    except Exception as e:
        logger.error(f"Error adding user to app_users group: {str(e)}")
        raise e
