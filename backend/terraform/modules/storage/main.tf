# Create S3 bucket for audio files and transcripts
resource "aws_s3_bucket" "storage_bucket" {
  bucket = var.storage_bucket
  force_destroy = true  # Allows Terraform to delete the bucket even if it contains files
}

# Enable versioning for the S3 bucket
resource "aws_s3_bucket_versioning" "transcription_bucket_versioning" {
  bucket = aws_s3_bucket.storage_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Configure CORS for the S3 bucket
resource "aws_s3_bucket_cors_configuration" "bucket_cors" {
  bucket = aws_s3_bucket.storage_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]  # In production, restrict to your domain
    expose_headers  = ["ETag", "Content-Type", "Content-Length"]
    max_age_seconds = 3000
  }
}

# Create S3 bucket policy for Transcribe access
resource "aws_s3_bucket_policy" "transcribe_access_policy" {
  bucket = aws_s3_bucket.storage_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowTranscribeAccess"
        Effect = "Allow"
        Principal = {
          Service = "transcribe.amazonaws.com"
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${aws_s3_bucket.storage_bucket.id}",
          "arn:aws:s3:::${aws_s3_bucket.storage_bucket.id}/*"
        ]
      }
    ]
  })
}

# Create folder structure in S3
resource "aws_s3_object" "audio" {
  bucket       = aws_s3_bucket.storage_bucket.id
  key          = "audio/"
  content      = ""  # Add empty content
  content_type = "application/x-directory"
}

resource "aws_s3_object" "transcripts" {
  bucket       = aws_s3_bucket.storage_bucket.id
  key          = "transcripts/"
  content      = ""  # Add empty content
  content_type = "application/x-directory"
}

resource "aws_s3_object" "summaries" {
  bucket       = aws_s3_bucket.storage_bucket.id
  key          = "summaries/"
  content      = ""  # Add empty content
  content_type = "application/x-directory"
}

resource "aws_s3_object" "transcribed-conversations" {
  bucket       = aws_s3_bucket.storage_bucket.id
  key          = "transcribed-conversations/"
  content      = ""  # Add empty content
  content_type = "application/x-directory"
}

# DynamoDB table for meeting summaries
resource "aws_dynamodb_table" "meeting_summaries" {
  name           = "MeetingSummaries"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "createdAt"
    type = "S"
  }
  
  global_secondary_index {
    name               = "createdAt-index"
    hash_key           = "createdAt"
    projection_type    = "ALL"
  }
  
  tags = var.tags
}

# DynamoDB table for meeting statistics
resource "aws_dynamodb_table" "meeting_statistics" {
  name           = "MeetingStatistics"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "date"
    type = "S"
  }
  
  attribute {
    name = "MeetingId"
    type = "S"
  }
  
  global_secondary_index {
    name               = "date-index"
    hash_key           = "date"
    projection_type    = "ALL"
  }
  
  global_secondary_index {
    name               = "MeetingId-index"
    hash_key           = "MeetingId"
    projection_type    = "ALL"
  }
  
  tags = var.tags
}
