output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.frontend_distribution.domain_name
  description = "The domain name of the CloudFront distribution"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.frontend_distribution.id
  description = "The ID of the CloudFront distribution"
}

output "cloudfront_distribution_arn" {
  value       = aws_cloudfront_distribution.frontend_distribution.arn
  description = "The ARN of the CloudFront distribution"
}

output "frontend_bucket_name" {
  value       = aws_s3_bucket.frontend_bucket.bucket
  description = "The name of the frontend S3 bucket"
}

output "frontend_bucket_arn" {
  value       = aws_s3_bucket.frontend_bucket.arn
  description = "The ARN of the frontend S3 bucket"
}
