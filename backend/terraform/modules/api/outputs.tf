output "appsync_api_url" {
  value = aws_appsync_graphql_api.meeting_summarizer_api.uris["GRAPHQL"]
  description = "URL of the AppSync GraphQL API endpoint"
}

# Add the missing api_endpoint output
output "api_endpoint" {
  value = aws_appsync_graphql_api.meeting_summarizer_api.uris["GRAPHQL"]
  description = "URL of the AppSync GraphQL API endpoint"
}
