import json
import boto3
import os
import logging
from boto3.dynamodb.conditions import Key
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource("dynamodb")


# Helper class to convert Decimal to float for JSON serialization
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)


def lambda_handler(event, context):
    """
    Lambda function to get meeting summaries from DynamoDB.
    Returns a list of summaries with pagination support.
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Get the table name from environment variables
        table_name = os.environ.get("DYNAMODB_TABLE", "MeetingSummaries")
        logger.info(f"Using DynamoDB table: {table_name}")
        
        # Check if the table exists
        try:
            dynamodb_client = boto3.client('dynamodb')
            table_description = dynamodb_client.describe_table(TableName=table_name)
            logger.info(f"Table exists: {table_name}")
        except Exception as e:
            logger.error(f"Error checking table existence: {str(e)}")
            # Return empty items if table doesn't exist
            return {"getSummaries": {"items": [], "nextToken": None}}
        
        table = dynamodb.Table(table_name)

        # Parse pagination parameters
        limit = event.get("limit", 20)
        next_token = event.get("nextToken")

        # Prepare query parameters
        query_params = {
            "Limit": limit,
        }

        # Add pagination token if provided
        if next_token:
            try:
                # next_token is expected to be a JSON string containing the LastEvaluatedKey
                last_evaluated_key = json.loads(next_token)
                query_params["ExclusiveStartKey"] = last_evaluated_key
            except Exception as e:
                logger.warning(f"Invalid nextToken: {next_token}, error: {str(e)}")

        # Query the table
        logger.info(f"Scanning DynamoDB table: {table_name} with params: {query_params}")
        try:
            response = table.scan(**query_params)
        except Exception as e:
            logger.error(f"Error scanning DynamoDB table: {str(e)}")
            # Return empty items on scan error
            return {"getSummaries": {"items": [], "nextToken": None}}

        # Process the results
        items = response.get("Items", [])
        logger.info(f"Found {len(items)} items")

        # Ensure items is never null
        if items is None:
            items = []
            logger.warning("Items was null, setting to empty array")

        # Prepare the next token
        next_token_value = None
        if "LastEvaluatedKey" in response:
            # Convert LastEvaluatedKey to a JSON string for the nextToken
            next_token_value = json.dumps(
                response["LastEvaluatedKey"], cls=DecimalEncoder
            )

        # Prepare the result - return in the format expected by the frontend
        # The frontend expects {items: [...], nextToken: ...} directly
        result = {
            "items": items,
            "nextToken": next_token_value
        }

        # Convert Decimal to float for JSON serialization
        result_json = json.dumps(result, cls=DecimalEncoder)
        result = json.loads(result_json)

        logger.info(f"Returning {len(items)} summary items directly")
        return result

    except Exception as e:
        logger.error(f"Error getting summaries: {str(e)}")
        # Return empty items instead of error - in the format expected by the frontend
        return {"items": [], "nextToken": None}
