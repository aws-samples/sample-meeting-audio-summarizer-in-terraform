# DynamoDB table for tracking file processing status
resource "aws_dynamodb_table" "processing_status" {
  name           = "${var.app_name}-processing-status-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "file_id"

  attribute {
    name = "file_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name               = "UserIndex"
    hash_key           = "user_id"
    range_key          = "created_at"
    projection_type    = "ALL"
  }

  tags = {
    Name        = "${var.app_name}-processing-status"
    Environment = var.environment
  }
}
