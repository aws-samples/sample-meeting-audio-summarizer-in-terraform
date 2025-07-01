output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.meeting_summary_pool.id
}

output "cognito_user_pool_arn" {
  value = aws_cognito_user_pool.meeting_summary_pool.arn
}

output "cognito_app_client_id" {
  value = aws_cognito_user_pool_client.meeting_summary_client.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.meeting_summary_client.id
  description = "ID of the Cognito User Pool Client"
}

output "cognito_domain" {
  value = "https://${var.cognito_domain_prefix}.auth.${data.aws_region.current.name}.amazoncognito.com"
}

output "cognito_identity_pool_id" {
  value = aws_cognito_identity_pool.identity_pool.id
}

output "iam_roles" {
  value = {
    # Core roles
    cognito_authenticated_role = aws_iam_role.cognito_authenticated_role.arn
    cognito_management_role = aws_iam_role.cognito_management_role.arn
    
    # Lambda function specific roles - each with dedicated permissions
    lambda_function_transcription_role = aws_iam_role.lambda_function_transcription_role.arn
    bedrock_invoke_model_role = aws_iam_role.bedrock_invoke_model_role.arn
    step_functions_role = aws_iam_role.step_functions_role.arn
    file_upload_role = aws_iam_role.file_upload_role.arn
    meeting_summary_search_role = aws_iam_role.meeting_summary_search_role.arn
    meeting_summary_delete_role = aws_iam_role.meeting_summary_delete_role.arn
    process_summary_to_dynamodb_role = aws_iam_role.process_summary_to_dynamodb_role.arn
    meeting_statistics_role = aws_iam_role.meeting_statistics_role.arn
    
    # State machine trigger role
    state_machine_trigger_role = aws_iam_role.state_machine_trigger_role.arn
  }
}

output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}

