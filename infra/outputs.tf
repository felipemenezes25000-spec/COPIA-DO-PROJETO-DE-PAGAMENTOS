output "vpc_id" {
  value = aws_vpc.main.id
}

output "alb_dns" {
  value       = aws_lb.main.dns_name
  description = "DNS do ALB — usar para testar antes de trocar DNS"
}

output "db_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "Endpoint do PostgreSQL — usar na connection string"
}

output "redis_endpoint" {
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
  description = "Endpoint do Redis — usar no SignalR backplane"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "URL do ECR — usar no docker push"
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.frontend.domain_name
  description = "Domain do CloudFront — usar para testar frontend"
}

output "s3_prescriptions_bucket" {
  value = aws_s3_bucket.prescriptions.id
}

output "s3_frontend_bucket" {
  value = aws_s3_bucket.frontend.id
}
