# Variables for the resolvers module
variable "api_id" {
  description = "The ID of the AppSync GraphQL API"
  type        = string
}

variable "lambda_datasources" {
  description = "Map of Lambda data sources"
  type        = map(any)
}

variable "dynamodb_datasource" {
  description = "Name of the DynamoDB data source"
  type        = string
}

variable "delete_summaries_function_arn" {
  description = "ARN of the Lambda function for deleting summaries"
  type        = string
}

variable "lambda_role_arn" {
  description = "ARN of the Lambda role"
  type        = string
}

# Get Summaries Resolver - commented out to avoid conflict
# resource "aws_appsync_resolver" "get_summaries_resolver" {
#   api_id      = var.api_id
#   type        = "Query"
#   field       = "getSummaries"
#   data_source = var.dynamodb_datasource

#   request_template  = file("${path.module}/Query.getSummaries.req.vtl")
#   response_template = file("${path.module}/Query.getSummaries.res.vtl")
# }

# Get Summary Resolver - commented out to avoid conflict
# resource "aws_appsync_resolver" "get_summary_resolver" {
#   api_id      = var.api_id
#   type        = "Query"
#   field       = "getSummary"
#   data_source = var.dynamodb_datasource
#
#   request_template  = file("${path.module}/Query.getSummary.req.vtl")
#   response_template = file("${path.module}/Query.getSummary.res.vtl")
# }

# Search Summaries Resolver - commented out to avoid conflict
# resource "aws_appsync_resolver" "search_summaries_resolver" {
#   api_id      = var.api_id
#   type        = "Query"
#   field       = "searchSummaries"
#   data_source = var.dynamodb_datasource
#
#   request_template  = file("${path.module}/Query.searchSummaries.req.vtl")
#   response_template = file("${path.module}/Query.searchSummaries.res.vtl")
# }

# Get Statistics Resolver - commented out to avoid conflict
# resource "aws_appsync_resolver" "get_statistics_resolver" {
#   api_id      = var.api_id
#   type        = "Query"
#   field       = "getStatistics"
#   data_source = var.lambda_datasources["get_statistics_function_arn"].name
#
#   request_template  = file("${path.module}/Query.getStatistics.req.vtl")
#   response_template = file("${path.module}/Query.getStatistics.res.vtl")
# }
