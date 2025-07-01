import json
import boto3
import os
import logging
from datetime import datetime
from collections import Counter, defaultdict
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource("dynamodb")


# Custom JSON encoder to handle Decimal objects
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def lambda_handler(event, context):
    """
    Lambda function to aggregate statistics from individual meeting statistics.
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Check if this is an AppSync invocation
        if "field" in event and event["field"] == "getStatistics":
            # This is a request from AppSync to get statistics
            stats_table_name = os.environ.get("STATISTICS_TABLE", "MeetingStatistics")
            summaries_table_name = os.environ.get("DYNAMODB_TABLE", "MeetingSummaries")
            
            logger.info(f"Using statistics table: {stats_table_name}")
            logger.info(f"Using summaries table: {summaries_table_name}")
            
            # Check if the tables exist
            try:
                dynamodb_client = boto3.client('dynamodb')
                table_description = dynamodb_client.describe_table(TableName=stats_table_name)
                logger.info(f"Table exists: {stats_table_name}")
            except Exception as e:
                logger.error(f"Error checking table existence: {str(e)}")
                # Return default statistics if table doesn't exist
                return get_default_statistics()
                
            # Scan the statistics table
            stats_table = dynamodb.Table(stats_table_name)
            stats_response = stats_table.scan()
            stats_items = stats_response.get("Items", [])
            
            # Continue scanning if we haven't retrieved all items
            while "LastEvaluatedKey" in stats_response:
                stats_response = stats_table.scan(ExclusiveStartKey=stats_response["LastEvaluatedKey"])
                stats_items.extend(stats_response.get("Items", []))
            
            logger.info(f"Retrieved {len(stats_items)} meeting statistics records")
            
            # Ensure all items have required fields
            for item in stats_items:
                # Ensure meetingId is not null
                if "meetingId" not in item or item["meetingId"] is None:
                    # Use id as meetingId if available, otherwise generate a unique ID
                    if "id" in item and item["id"] is not None:
                        item["meetingId"] = item["id"]
                    else:
                        import uuid
                        item["meetingId"] = str(uuid.uuid4())
                        
                # Ensure other fields have default values
                if "meetingType" not in item:
                    item["meetingType"] = "Other"
                if "title" not in item:
                    item["title"] = f"Meeting {item.get('meetingId', 'Unknown')}"
            
            # Calculate aggregate statistics
            total_meetings = len(stats_items)
            total_duration = sum(item.get("duration", 0) for item in stats_items)
            average_duration = round(total_duration / total_meetings) if total_meetings > 0 else 0
            longest_meeting = max((item.get("duration", 0) for item in stats_items), default=0)
            
            # Calculate meetings by day
            meetings_by_day = defaultdict(int)
            for item in stats_items:
                if "date" in item:
                    try:
                        date_obj = datetime.fromisoformat(item["date"].replace("Z", "+00:00"))
                        day = date_obj.strftime("%A")  # Get day name (Monday, Tuesday, etc.)
                        meetings_by_day[day] += 1
                    except Exception as e:
                        logger.warning(f"Error parsing date: {item.get('date')}, {str(e)}")
            
            # Ensure all days of the week are represented
            for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
                if day not in meetings_by_day:
                    meetings_by_day[day] = 0
            
            # Calculate meetings by month
            meetings_by_month = []
            month_counts = defaultdict(int)
            
            for item in stats_items:
                if "date" in item:
                    try:
                        date_obj = datetime.fromisoformat(item["date"].replace("Z", "+00:00"))
                        month = date_obj.strftime("%Y-%m")
                        month_counts[month] += 1
                    except Exception as e:
                        logger.warning(f"Error parsing date: {item.get('date')}, {str(e)}")
            
            # Convert to the format expected by the frontend
            for month, count in sorted(month_counts.items()):
                month_name = datetime.strptime(month, "%Y-%m").strftime("%b %Y")
                meetings_by_month.append({"month": month_name, "count": count})
            
            # If no data, provide some default months
            if not meetings_by_month:
                current_date = datetime.now()
                for i in range(6):
                    month = (current_date.month - i) % 12
                    if month == 0:
                        month = 12
                    year = current_date.year - ((current_date.month - i) // 12)
                    month_name = datetime(year, month, 1).strftime("%b %Y")
                    meetings_by_month.append({"month": month_name, "count": 0})
                meetings_by_month.reverse()
            
            # Format the statistics
            statistics = {
                "totalMeetings": total_meetings,
                "totalDuration": f"{total_duration} min",
                "averageDuration": f"{average_duration} min",
                "longestMeeting": f"{longest_meeting} min",
                "meetingsByDay": meetings_by_day,
                "meetingsByMonth": meetings_by_month,
                "meetings": stats_items  # Now includes meetingType from summaries
            }
            
            # Log the full statistics object for debugging
            logger.info(f"Calculated statistics: {json.dumps(statistics, cls=DecimalEncoder)}")
            
            # Log specific information about meetings
            if stats_items:
                logger.info(f"Number of meetings: {len(stats_items)}")
                for i, item in enumerate(stats_items[:3]):  # Log first 3 meetings
                    logger.info(f"Meeting {i+1} sample: {json.dumps(item, cls=DecimalEncoder)}")
                    if 'language' in item:
                        logger.info(f"Meeting {i+1} language: {item['language']}")
                    if 'meetingType' in item:
                        logger.info(f"Meeting {i+1} type: {item['meetingType']}")
            else:
                logger.warning("No meetings found in stats_items")
            
            return statistics
        else:
            # This is a direct invocation, not from AppSync
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "message": "Invalid request. This function should be invoked via AppSync."
                })
            }
    except Exception as e:
        logger.error(f"Error calculating statistics: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": f"Error calculating statistics: {str(e)}"
            })
        }


def get_default_statistics():
    """
    Return default statistics when no data is available.
    """
    # Create default data for charts
    default_meetings_by_month = []
    current_date = datetime.now()
    for i in range(6):
        month = (current_date.month - i) % 12
        if month == 0:
            month = 12
        year = current_date.year - ((current_date.month - i) // 12)
        month_name = datetime(year, month, 1).strftime("%b %Y")
        default_meetings_by_month.append({"month": month_name, "count": 0})
    default_meetings_by_month.reverse()
    
    default_meetings_by_day = {
        "Monday": 0,
        "Tuesday": 0,
        "Wednesday": 0,
        "Thursday": 0,
        "Friday": 0,
        "Saturday": 0,
        "Sunday": 0
    }
    
    return {
        "totalMeetings": 0,
        "totalDuration": "0 min",
        "averageDuration": "0 min",
        "longestMeeting": "0 min",
        "meetingsByDay": default_meetings_by_day,
        "meetingsByMonth": default_meetings_by_month,
        "meetings": []
    }
