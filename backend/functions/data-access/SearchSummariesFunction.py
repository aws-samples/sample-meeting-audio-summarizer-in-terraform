import json
import boto3
import os
import logging
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Helper class to convert Decimal to float for JSON serialization
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)

def lambda_handler(event, context):
    """
    Combined Lambda function to search meeting summaries in DynamoDB.
    This function combines the functionality of both SearchMeetingSummariesFunction
    and SearchSummariesFunction to provide comprehensive search capabilities.
    
    Returns a list of summaries that match the search query.
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Get the search query from the event
        query = event.get('query')
        if not query:
            logger.warning("No search query provided")
            return {
                "searchSummaries": []
            }
        
        # Get the table name from environment variables
        # Support both environment variable names for backward compatibility
        table_name = os.environ.get('DYNAMODB_TABLE') or os.environ.get('MEETING_SUMMARIES_TABLE', 'MeetingSummaries')
        table = dynamodb.Table(table_name)
        
        # Scan the table for items matching the query
        logger.info(f"Searching DynamoDB table: {table_name} for query: {query}")
        
        # Convert query to lowercase for case-insensitive search
        query_lower = query.lower()
        
        # Scan the table
        response = table.scan()
        items = response.get('Items', [])
        
        # Continue scanning if we have more items (pagination)
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        # Filter items based on the query
        # This is a simple implementation - for production, consider using DynamoDB's FilterExpression
        # or a dedicated search service like Amazon OpenSearch
        filtered_items = []
        for item in items:
            # Combined search logic from both original functions
            # Check if query matches any of the fields
            if (
                query_lower in item.get('title', '').lower() or
                query_lower in item.get('summary', '').lower() or
                any(query_lower in str(s).lower() for s in item.get('stakeholders', [])) or
                query_lower in item.get('context', '').lower() or
                any(query_lower in str(o).lower() for o in item.get('objectives', [])) or
                any(query_lower in str(c).lower() for c in item.get('conversationDetails', [])) or
                any(query_lower in str(k).lower() for k in item.get('keyPoints', [])) or
                any(query_lower in str(a).lower() for a in item.get('actionItems', []))
            ):
                filtered_items.append(item)
        
        logger.info(f"Found {len(filtered_items)} matching items")
        
        # Support both return formats for backward compatibility
        if 'returnFormat' in event and event['returnFormat'] == 'legacy':
            # Original SearchMeetingSummariesFunction format
            return filtered_items
        else:
            # SearchSummariesFunction format with Decimal handling
            result = {
                "searchSummaries": filtered_items
            }
            result_json = json.dumps(result, cls=DecimalEncoder)
            result = json.loads(result_json)
            
            return result
        
    except Exception as e:
        logger.error(f"Error searching summaries: {str(e)}")
        # Support both error formats for backward compatibility
        if 'returnFormat' in event and event['returnFormat'] == 'legacy':
            return {
                "error": f"Failed to search summaries: {str(e)}"
            }
        else:
            return {
                "searchSummaries": [],
                "error": str(e)
            }
