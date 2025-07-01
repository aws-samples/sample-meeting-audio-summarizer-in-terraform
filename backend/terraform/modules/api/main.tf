resource "aws_appsync_graphql_api" "meeting_summarizer_api" {
  name                = "${var.app_name}-api-${var.environment}"
  authentication_type = "AMAZON_COGNITO_USER_POOLS"
  
  user_pool_config {
    user_pool_id   = var.user_pool_id
    aws_region     = data.aws_region.current.name
    default_action = "ALLOW"
  }

  schema = file("${path.module}/schema.graphql")

  log_config {
    cloudwatch_logs_role_arn = aws_iam_role.appsync_logs_role.arn
    field_log_level          = "ERROR"
  }

  tags = {
    Environment = var.environment
    Name        = "${var.app_name}-api"
  }
}

# IAM role for AppSync to write logs to CloudWatch
resource "aws_iam_role" "appsync_logs_role" {
  name = "${var.app_name}-appsync-logs-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "appsync_logs_policy" {
  name = "${var.app_name}-appsync-logs-policy-${var.environment}"
  role = aws_iam_role.appsync_logs_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Data source for current AWS region
data "aws_region" "current" {}

# Lambda data sources
# Lambda data sources
resource "aws_appsync_datasource" "lambda_datasources" {
  for_each = var.lambda_functions

  api_id           = aws_appsync_graphql_api.meeting_summarizer_api.id
  name             = "${each.key}_datasource"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_lambda_role.arn

  lambda_config {
    function_arn = each.value
  }
}

# DynamoDB data source
resource "aws_appsync_datasource" "dynamodb_datasource" {
  api_id           = aws_appsync_graphql_api.meeting_summarizer_api.id
  name             = "DynamoDBDataSource"
  type             = "AMAZON_DYNAMODB"
  service_role_arn = aws_iam_role.appsync_dynamodb_role.arn

  dynamodb_config {
    table_name = var.dynamodb_table_name
    region     = data.aws_region.current.name
  }
}

# IAM role for AppSync to invoke Lambda functions
resource "aws_iam_role" "appsync_lambda_role" {
  name = "${var.app_name}-appsync-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "appsync_lambda_policy" {
  name = "${var.app_name}-appsync-lambda-policy-${var.environment}"
  role = aws_iam_role.appsync_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "lambda:InvokeFunction"
        ]
        Effect   = "Allow"
        Resource = values(var.lambda_functions)
      }
    ]
  })
}

# IAM role for AppSync to access DynamoDB
resource "aws_iam_role" "appsync_dynamodb_role" {
  name = "${var.app_name}-appsync-dynamodb-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "appsync_dynamodb_policy" {
  name = "${var.app_name}-appsync-dynamodb-policy-${var.environment}"
  role = aws_iam_role.appsync_dynamodb_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Effect   = "Allow"
        Resource = [var.dynamodb_table_arn, "${var.dynamodb_table_arn}/index/*"]
      }
    ]
  })
}

# Resolvers
# Include all resolver files from the resolvers directory
module "resolvers" {
  source = "./resolvers"
  
  api_id            = aws_appsync_graphql_api.meeting_summarizer_api.id
  lambda_datasources = aws_appsync_datasource.lambda_datasources
  dynamodb_datasource = aws_appsync_datasource.dynamodb_datasource.name
  delete_summaries_function_arn = var.lambda_functions["delete_summaries_function_arn"]
  lambda_role_arn = aws_iam_role.appsync_lambda_role.arn
}

# Create resolver for getSummaries query

# Create resolver for getSummary query - already exists in state

# Create resolver for searchSummaries query

# Create resolver for getStatistics query
# Create resolver for getSummaries query

# Create resolver for getSummary query - already exists in state

# Create resolver for searchSummaries query

# Create resolver for getStatistics query
# Create resolver for getSummaries query

# Create resolver for getSummary query

# Create resolver for searchSummaries query

# Create resolver for getStatistics query
# Create resolver for getSummaries query
resource "aws_appsync_resolver" "get_summaries_resolver" {
  api_id      = aws_appsync_graphql_api.meeting_summarizer_api.id
  type        = "Query"
  field       = "getSummaries"
  data_source = aws_appsync_datasource.lambda_datasources["get_summaries_function_arn"].name
  
  request_template  = <<-EOT
    {
        "version": "2018-05-29",
        "operation": "Invoke",
        "payload": {
            "field": "getSummaries",
            "arguments": $utils.toJson($context.arguments)
        }
    }
  EOT
  
  response_template = <<-EOT
    #if($context.error)
        $util.error($context.error.message, $context.error.type)
    #end
    $util.toJson($context.result)
  EOT
}

# Create resolver for getSummary query
resource "aws_appsync_resolver" "get_summary_resolver" {
  api_id      = aws_appsync_graphql_api.meeting_summarizer_api.id
  type        = "Query"
  field       = "getSummary"
  data_source = aws_appsync_datasource.dynamodb_datasource.name
  
  request_template  = <<-EOT
    {
        "version": "2018-05-29",
        "operation": "GetItem",
        "key": {
            "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
        }
    }
  EOT
  
  response_template = <<-EOT
    $util.toJson($ctx.result)
  EOT
}

# Create resolver for searchSummaries query
resource "aws_appsync_resolver" "search_summaries_resolver" {
  api_id      = aws_appsync_graphql_api.meeting_summarizer_api.id
  type        = "Query"
  field       = "searchSummaries"
  data_source = aws_appsync_datasource.lambda_datasources["search_summaries_function_arn"].name
  
  request_template  = <<-EOT
    {
        "version": "2018-05-29",
        "operation": "Invoke",
        "payload": {
            "field": "searchSummaries",
            "arguments": $utils.toJson($context.arguments)
        }
    }
  EOT
  
  response_template = <<-EOT
    #if($context.error)
        $util.error($context.error.message, $context.error.type)
    #end
    $util.toJson($context.result)
  EOT
}

# Create resolver for getStatistics query
resource "aws_appsync_resolver" "get_statistics_resolver" {
  api_id      = aws_appsync_graphql_api.meeting_summarizer_api.id
  type        = "Query"
  field       = "getStatistics"
  data_source = aws_appsync_datasource.lambda_datasources["get_statistics_function_arn"].name
  
  request_template  = <<-EOT
    {
        "version": "2018-05-29",
        "operation": "Invoke",
        "payload": {
            "field": "getStatistics",
            "arguments": $utils.toJson($context.arguments)
        }
    }
  EOT
  
  response_template = <<-EOT
    #if($context.error)
        $util.error($context.error.message, $context.error.type)
    #end
    $util.toJson($context.result)
  EOT
}

# Create resolver for getProcessingStatus query
resource "aws_appsync_resolver" "get_processing_status_resolver" {
  api_id      = aws_appsync_graphql_api.meeting_summarizer_api.id
  type        = "Query"
  field       = "getProcessingStatus"
  data_source = aws_appsync_datasource.lambda_datasources["get_processing_status_function_arn"].name
  
  request_template  = file("${path.module}/resolvers/Query.getProcessingStatus.req.vtl")
  response_template = file("${path.module}/resolvers/Query.getProcessingStatus.res.vtl")
}

# Create resolver for listUserProcessingStatus query
resource "aws_appsync_resolver" "list_user_processing_status_resolver" {
  api_id      = aws_appsync_graphql_api.meeting_summarizer_api.id
  type        = "Query"
  field       = "listUserProcessingStatus"
  data_source = aws_appsync_datasource.lambda_datasources["get_processing_status_function_arn"].name
  
  request_template  = file("${path.module}/resolvers/Query.listUserProcessingStatus.req.vtl")
  response_template = file("${path.module}/resolvers/Query.listUserProcessingStatus.res.vtl")
}

# Create resolver for getUploadUrl mutation (MISSING - This was the issue!)
resource "aws_appsync_resolver" "get_upload_url_resolver" {
  api_id      = aws_appsync_graphql_api.meeting_summarizer_api.id
  type        = "Mutation"
  field       = "getUploadUrl"
  data_source = aws_appsync_datasource.lambda_datasources["upload_file_function_arn"].name
  
  request_template  = file("${path.module}/resolvers/Mutation.getUploadUrl.req.vtl")
  response_template = file("${path.module}/resolvers/Mutation.getUploadUrl.res.vtl")
}
