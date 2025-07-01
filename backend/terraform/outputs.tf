output "storage_bucket_name" {
  description = "Name of the S3 bucket for audio files and transcripts"
  value       = module.storage.storage_bucket
}

output "cognito_user_pool_id" {
  description = "ID of the Cognito user pool"
  value       = module.auth.cognito_user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito app client"
  value       = module.auth.cognito_user_pool_client_id
}

output "cognito_identity_pool_id" {
  description = "ID of the Cognito identity pool"
  value       = module.auth.cognito_identity_pool_id
}

output "api_endpoint" {
  description = "URL of the AppSync API"
  value       = module.api.api_endpoint
}

output "cloudfront_distribution_domain" {
  description = "Domain name of the CloudFront distribution"
  value       = module.network.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.network.cloudfront_distribution_id
}

output "state_machine_arn" {
  description = "ARN of the Step Functions state machine"
  value       = module.orchestration.state_machine_arn
}

output "aws_region" {
  description = "AWS region used for deployment"
  value       = var.aws_region
}

output "aws_profile" {
  description = "AWS profile used for deployment"
  value       = var.aws_profile
}

output "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend assets"
  value       = var.frontend_bucket_name
}
