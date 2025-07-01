# Create Cognito User Pool
resource "aws_cognito_user_pool" "meeting_summary_pool" {
  name = "MeetingSummarizerUserPool"
  
  # Add explicit email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }
  
  # Set verification message customization
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject = "Your verification code for Meeting Audio Summarizer"
    email_message = <<EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verify Your Email</title>
  <style type="text/css">
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.8;
      color: #333;
      background-color: #f5f7fa;
      margin: 0;
      padding: 0;
      font-size: 16px;
    }
    .container {
      max-width: 650px;
      margin: 40px auto;
      padding: 30px;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }
    .header {
      text-align: center;
      padding: 25px 0;
      border-bottom: 1px solid #eaeaea;
    }
    .header h1 {
      color: #4f46e5;
      font-size: 28px;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 35px 25px;
      font-size: 17px;
    }
    .content p {
      margin-bottom: 20px;
    }
    .verification-card {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: white;
      padding: 30px;
      margin: 30px 0;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .verification-code {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      margin: 15px 0;
    }
    .verification-label {
      font-size: 14px;
      text-transform: uppercase;
      opacity: 0.8;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      padding-top: 25px;
      border-top: 1px solid #eaeaea;
      font-size: 14px;
      color: #666;
    }
    .signature {
      margin-top: 30px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Meeting Audio Summarizer</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Thank you for signing up for Meeting Audio Summarizer. To complete your registration, please use the verification code below:</p>
      
      <div class="verification-card">
        <div class="verification-label">Your Verification Code</div>
        <div class="verification-code">{####}</div>
        <div>Valid for 24 hours</div>
      </div>
      
      <p>If you did not request this verification, please ignore this email.</p>
      
      <div class="signature">
        Thank you,<br>
        The Meeting Audio Summarizer Team
      </div>
    </div>
    <div class="footer">
      <p>2025 Meeting Audio Summarizer. All rights reserved.</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
EOF
  }
  
  # Add invitation message template
  admin_create_user_config {
    allow_admin_create_user_only = false
    
    invite_message_template {
      email_subject = "Welcome to Meeting Audio Summarizer"
      email_message = <<EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to Meeting Audio Summarizer</title>
  <style type="text/css">
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.8;
      color: #333;
      background-color: #f5f7fa;
      margin: 0;
      padding: 0;
      font-size: 16px;
    }
    .container {
      max-width: 650px;
      margin: 40px auto;
      padding: 30px;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }
    .header {
      text-align: center;
      padding: 25px 0;
      border-bottom: 1px solid #eaeaea;
    }
    .header h1 {
      color: #4f46e5;
      font-size: 28px;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 35px 25px;
      font-size: 17px;
    }
    .content p {
      margin-bottom: 20px;
    }
    .verification-card {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: white;
      padding: 30px;
      margin: 30px 0;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .verification-code {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      margin: 15px 0;
    }
    .verification-label {
      font-size: 14px;
      text-transform: uppercase;
      opacity: 0.8;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      padding-top: 25px;
      border-top: 1px solid #eaeaea;
      font-size: 14px;
      color: #666;
    }
    .signature {
      margin-top: 30px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Meeting Audio Summarizer</h1>
    </div>
    <div class="content">
      <p>Hello {username},</p>
      <p>You have been invited to join Meeting Audio Summarizer. Your temporary password is:</p>
      
      <div class="verification-card">
        <div class="verification-label">Your Temporary Password</div>
        <div class="verification-code">{####}</div>
        <div>Please change upon first login</div>
      </div>
      
      <p>Please use this temporary password to sign in, and you will be prompted to create a new password.</p>
      
      <div class="signature">
        Thank you,<br>
        The Meeting Audio Summarizer Team
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 Meeting Audio Summarizer. All rights reserved.</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
EOF
      sms_message = "Your Meeting Audio Summarizer username is {username} and temporary password is {####}."
    }
  }
  
  # Enable auto verification for email
  auto_verified_attributes = ["email"]
  
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  
  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true
  }
  
  username_attributes = ["email"]
  
  # Add a post confirmation Lambda trigger
  lambda_config {
    post_confirmation = aws_lambda_function.cognito_post_confirmation_trigger.arn
  }
}

# Create Cognito User Pool Domain with unique name
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.cognito_domain_prefix}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.meeting_summary_pool.id
}

# Generate a random string to make the Cognito domain unique
resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Create Cognito User Pool Client
resource "aws_cognito_user_pool_client" "meeting_summary_client" {
  name                = "meeting-summarizer-client"
  user_pool_id        = aws_cognito_user_pool.meeting_summary_pool.id
  
  generate_secret     = false
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
  
  callback_urls = ["http://localhost:3000/callback"]
  logout_urls   = ["http://localhost:3000/logout"]
  
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["phone", "email", "openid", "profile", "aws.cognito.signin.user.admin"]
  supported_identity_providers         = ["COGNITO"]
}

# Create a role for the PostConfirmation Lambda function
resource "aws_iam_role" "cognito_post_confirmation_role" {
  name = "CognitoPostConfirmationRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Create the PostConfirmation Lambda function
resource "aws_lambda_function" "cognito_post_confirmation_trigger" {
  function_name    = "CognitoPostConfirmationTrigger"
  description      = "Lambda function that adds users to the add_users group after email confirmation"
  filename         = "${path.module}/../../../functions/zipped/CognitoPostConfirmationTrigger.zip"
  role             = aws_iam_role.cognito_post_confirmation_role.arn
  handler          = "CognitoPostConfirmationTrigger.lambda_handler"
  runtime          = "python3.12"
  timeout          = 900
  source_code_hash = filebase64sha256("${path.module}/../../../functions/zipped/CognitoPostConfirmationTrigger.zip")
}

# Create a dedicated role for the StateMachineTriggerFunction
resource "aws_iam_role" "state_machine_trigger_role" {
  name = "StateMachineTriggerRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Create a dedicated role for Lambda transcription functions
resource "aws_iam_role" "lambda_function_transcription_role" {
  name = "LambdaTranscriptionRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Create a dedicated role for Bedrock invoke model
resource "aws_iam_role" "bedrock_invoke_model_role" {
  name = "BedrockInvokeModelRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Create a dedicated role for Step Functions
resource "aws_iam_role" "step_functions_role" {
  name = "StepFunctionsRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.state_machine_assume_role_policy.json
}

# Create a dedicated role for file upload
resource "aws_iam_role" "file_upload_role" {
  name = "FileUploadRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Create a dedicated role for meeting summary search
resource "aws_iam_role" "meeting_summary_search_role" {
  name = "MeetingSummarySearchRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Create a dedicated role for meeting summary delete
resource "aws_iam_role" "meeting_summary_delete_role" {
  name = "MeetingSummaryDeleteRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Create a dedicated role for processing summary to DynamoDB
resource "aws_iam_role" "process_summary_to_dynamodb_role" {
  name = "ProcessSummaryToDynamoDBRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Create a dedicated role for meeting statistics
resource "aws_iam_role" "meeting_statistics_role" {
  name = "MeetingStatisticsRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Create IAM role for Cognito management
resource "aws_iam_role" "cognito_management_role" {
  name = "CognitoManagementRole"
  force_detach_policies = true
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

# Attach basic Lambda execution role to all Lambda roles
resource "aws_iam_role_policy_attachment" "lambda_basic_execution_attachments" {
  for_each = {
    state_machine_trigger = aws_iam_role.state_machine_trigger_role.name
    lambda_function_transcription = aws_iam_role.lambda_function_transcription_role.name
    bedrock_invoke_model = aws_iam_role.bedrock_invoke_model_role.name
    step_functions = aws_iam_role.step_functions_role.name
    file_upload = aws_iam_role.file_upload_role.name
    meeting_summary_search = aws_iam_role.meeting_summary_search_role.name
    meeting_summary_delete = aws_iam_role.meeting_summary_delete_role.name
    process_summary_to_dynamodb = aws_iam_role.process_summary_to_dynamodb_role.name
    meeting_statistics = aws_iam_role.meeting_statistics_role.name
    cognito_management = aws_iam_role.cognito_management_role.name
    cognito_post_confirmation = aws_iam_role.cognito_post_confirmation_role.name
  }
  
  role       = each.value
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach S3 read access to roles that need it
resource "aws_iam_role_policy_attachment" "s3_read_access_attachments" {
  for_each = {
    state_machine_trigger = aws_iam_role.state_machine_trigger_role.name
    lambda_function_transcription = aws_iam_role.lambda_function_transcription_role.name
    bedrock_invoke_model = aws_iam_role.bedrock_invoke_model_role.name
    process_summary_to_dynamodb = aws_iam_role.process_summary_to_dynamodb_role.name
    meeting_statistics = aws_iam_role.meeting_statistics_role.name
  }
  
  role       = each.value
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

# Attach Step Functions execution policy to state_machine_trigger_role
resource "aws_iam_role_policy_attachment" "state_machine_trigger_step_functions" {
  role       = aws_iam_role.state_machine_trigger_role.name
  policy_arn = aws_iam_policy.step_functions_execution_policy.arn
}

# Attach Cognito management policy to cognito_management_role
resource "aws_iam_role_policy_attachment" "cognito_management_policy_attachment" {
  role       = aws_iam_role.cognito_management_role.name
  policy_arn = aws_iam_policy.cognito_management_policy.arn
}

# Attach Cognito post confirmation policy to cognito_post_confirmation_role
resource "aws_iam_role_policy_attachment" "cognito_post_confirmation_policy_attachment" {
  role       = aws_iam_role.cognito_post_confirmation_role.name
  policy_arn = aws_iam_policy.cognito_post_confirmation_policy.arn
}

# Attach DynamoDB access to roles that need it
resource "aws_iam_role_policy_attachment" "dynamodb_access_attachments" {
  for_each = {
    meeting_summary_search = aws_iam_role.meeting_summary_search_role.name
    meeting_summary_delete = aws_iam_role.meeting_summary_delete_role.name
    process_summary_to_dynamodb = aws_iam_role.process_summary_to_dynamodb_role.name
    meeting_statistics = aws_iam_role.meeting_statistics_role.name
    lambda_function_transcription = aws_iam_role.lambda_function_transcription_role.name
  }
  
  role       = each.value
  policy_arn = aws_iam_policy.dynamodb_access_policy.arn
}

# Attach Bedrock invoke model policy to bedrock_invoke_model_role
resource "aws_iam_role_policy_attachment" "bedrock_invoke_model_attachment" {
  role       = aws_iam_role.bedrock_invoke_model_role.name
  policy_arn = aws_iam_policy.bedrock_invoke_model_policy.arn
}

# Attach Transcribe access policy to lambda_function_transcription_role
resource "aws_iam_role_policy_attachment" "transcribe_access_attachment" {
  role       = aws_iam_role.lambda_function_transcription_role.name
  policy_arn = aws_iam_policy.transcribe_access_policy.arn
}

# Attach S3 write access to file_upload_role
resource "aws_iam_role_policy_attachment" "file_upload_s3_write_attachment" {
  role       = aws_iam_role.file_upload_role.name
  policy_arn = aws_iam_policy.s3_write_policy.arn
}

# Attach Step Functions execution policy to step_functions_role
resource "aws_iam_role_policy_attachment" "step_functions_execution_attachment" {
  role       = aws_iam_role.step_functions_role.name
  policy_arn = aws_iam_policy.step_functions_execution_policy.arn
}

# Attach Step Functions Lambda invoke policy to step_functions_role
resource "aws_iam_role_policy_attachment" "step_functions_lambda_invoke_attachment" {
  role       = aws_iam_role.step_functions_role.name
  policy_arn = aws_iam_policy.step_functions_lambda_invoke_policy.arn
}

# Attach transcription processing policy to lambda_function_transcription_role
resource "aws_iam_role_policy_attachment" "transcription_processing_policy_attachment" {
  role       = aws_iam_role.lambda_function_transcription_role.name
  policy_arn = aws_iam_policy.transcription_processing_policy.arn
}

# Attach summarization policy to bedrock_invoke_model_role
resource "aws_iam_role_policy_attachment" "summarization_policy_attachment" {
  role       = aws_iam_role.bedrock_invoke_model_role.name
  policy_arn = aws_iam_policy.summarization_policy.arn
}

# Attach Lambda invoke policy to roles that need to call UpdateProcessingStatusFunction
resource "aws_iam_role_policy_attachment" "lambda_invoke_policy_attachments" {
  for_each = {
    file_upload = aws_iam_role.file_upload_role.name
    lambda_function_transcription = aws_iam_role.lambda_function_transcription_role.name
    bedrock_invoke_model = aws_iam_role.bedrock_invoke_model_role.name
    process_summary_to_dynamodb = aws_iam_role.process_summary_to_dynamodb_role.name
  }
  
  role       = each.value
  policy_arn = aws_iam_policy.lambda_invoke_policy.arn
}



# Create Cognito User Group
resource "aws_cognito_user_group" "app_users" {
  name         = "app_users"
  user_pool_id = aws_cognito_user_pool.meeting_summary_pool.id
  description  = "Group for application users"
  precedence   = 10
}

# Grant permission for the Lambda function to invoke the Cognito User Pool
resource "aws_lambda_permission" "allow_cognito" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cognito_post_confirmation_trigger.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.meeting_summary_pool.arn
}
