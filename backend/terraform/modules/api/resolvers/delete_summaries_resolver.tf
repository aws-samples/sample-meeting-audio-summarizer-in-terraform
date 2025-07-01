# AppSync data source for deleteSummaries mutation
resource "aws_appsync_datasource" "delete_summaries_datasource" {
  api_id           = var.api_id
  name             = "DeleteSummariesFunction"
  service_role_arn = var.lambda_role_arn
  type             = "AWS_LAMBDA"
  
  lambda_config {
    function_arn = var.delete_summaries_function_arn
  }
}

# AppSync resolver for deleteSummaries mutation
resource "aws_appsync_resolver" "delete_summaries_resolver" {
  api_id      = var.api_id
  type        = "Mutation"
  field       = "deleteSummaries"
  data_source = aws_appsync_datasource.delete_summaries_datasource.name
  
  request_template  = file("${path.module}/Mutation.deleteSummaries.req.vtl")
  response_template = file("${path.module}/Mutation.deleteSummaries.res.vtl")
}

# AppSync resolver for deleteSummary mutation
resource "aws_appsync_resolver" "delete_summary_resolver" {
  api_id      = var.api_id
  type        = "Mutation"
  field       = "deleteSummary"
  data_source = aws_appsync_datasource.delete_summaries_datasource.name
  
  request_template  = file("${path.module}/Mutation.deleteSummary.req.vtl")
  response_template = file("${path.module}/Mutation.deleteSummary.res.vtl")
}
