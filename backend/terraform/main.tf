data "aws_caller_identity" "current" {}

provider "aws" {
  region                        = var.aws_region
  profile                       = var.aws_profile
}

# Storage Module - S3 buckets and DynamoDB tables
module "storage" {
  source = "./modules/storage"
  storage_bucket                = var.storage_bucket
  environment                   = var.environment
  app_name                      = var.app_name
}

# Auth Module - Cognito and IAM roles
module "auth" {
  source = "./modules/auth"
  aws_region                      = var.aws_region
  aws_account                     = data.aws_caller_identity.current.account_id
  storage_bucket                  = module.storage.storage_bucket
  meeting_statistics_table_name   = var.meeting_statistics_table_name
  meeting_summaries_table_name    = var.meeting_summaries_table_name
  model_id                        = var.model_id
  cognito_domain_prefix           = var.cognito_domain_prefix
  aws_profile                     = var.aws_profile
  cloudfront_distribution_id      = ""
  cloudfront_domain               = ""
}

# Compute Module - Lambda functions
module "compute" {
  source = "./modules/compute"
  
  aws_region                        = var.aws_region
  aws_account                       = data.aws_caller_identity.current.account_id
  meeting_statistics_table_name     = var.meeting_statistics_table_name
  meeting_summaries_table_name      = var.meeting_summaries_table_name
  processing_status_table_name      = module.storage.processing_status_table_name
  cognito_user_pool_id              = module.auth.cognito_user_pool_id
  iam_roles                         = module.auth.iam_roles
  storage_bucket                    = module.storage.storage_bucket 
  model_id                          = var.model_id
  inference_profile_prefix          = var.inference_profile_prefix
}

# Orchestration Module - Step Functions
module "orchestration" {
  source = "./modules/orchestration"
  
  aws_region                              = var.aws_region
  aws_account                             = data.aws_caller_identity.current.account_id
  storage_bucket                          = module.storage.storage_bucket
  iam_roles                               = module.auth.iam_roles
  lambda_functions                        = module.compute.lambda_functions
}

# Queue Processor Module - ProcessTranscriptionQueueFunction Lambda
module "queue_processor" {
  source = "./modules/queue-processor"
  
  storage_bucket                    = module.storage.storage_bucket
  state_machine_arn                 = module.orchestration.state_machine_arn
  lambda_function_transcription_role = module.auth.iam_roles.lambda_function_transcription_role
  processing_status_table_name      = module.storage.processing_status_table_name
  
  depends_on = [
    module.storage,
    module.orchestration
  ]
}

# API Module - AppSync API
module "api" {
  source = "./modules/api"
  
  environment                   = var.environment
  app_name                      = var.app_name
  user_pool_id                  = module.auth.cognito_user_pool_id
  lambda_functions              = module.compute.lambda_functions
  dynamodb_table_arn            = module.storage.dynamodb_table_arn
  dynamodb_table_name           = var.meeting_summaries_table_name
}

# Network Module - CloudFront distribution
module "network" {
  source = "./modules/network"
  frontend_bucket_name          = var.frontend_bucket_name
}

# Messaging module for SQS queue and event processing
module "messaging" {
   source = "./modules/messaging"
   storage_bucket                          = module.storage.storage_bucket
   environment                             = var.environment
   app_name                                = var.app_name
   transcription_queue_processor_function_arn = module.queue_processor.transcription_queue_processor_function_arn
   transcription_queue_processor_function_name = module.queue_processor.transcription_queue_processor_function_name
   summarize_meeting_function_arn          = module.compute.summarize_meeting_function_arn
   summarize_meeting_function_name         = module.compute.summarize_meeting_function_name
   store_summary_in_database_function_arn  = module.compute.store_summary_in_database_function_arn
   store_summary_in_database_function_name = module.compute.store_summary_in_database_function_name
   state_machine_arn                       = module.orchestration.state_machine_arn
   
   depends_on = [
     module.storage,
     module.compute,
     module.orchestration,
     module.queue_processor
   ]
}
