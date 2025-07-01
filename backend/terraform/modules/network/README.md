# Network Module

This module sets up CloudFront distribution for the meeting summarizer application.

## Resources Created

- CloudFront distribution for content delivery
- CloudFront origin access identity
- S3 bucket policy for CloudFront access

## Inputs

- `environment`: Deployment environment
- `app_name`: Application name
- `storage_bucket`: S3 bucket name for storage

## Outputs

- `cloudfront_domain_name`: CloudFront distribution domain name
- `cloudfront_distribution_id`: CloudFront distribution ID
