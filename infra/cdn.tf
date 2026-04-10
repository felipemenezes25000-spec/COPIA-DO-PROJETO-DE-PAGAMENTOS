# ============================================================
# CloudFront + S3 para frontend web
# ============================================================

# Provider alias for us-east-1 — required because ACM certs AND CloudFront WAFs must live in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "renoveja"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ACM certificate lookup for CloudFront (must be in us-east-1)
data "aws_acm_certificate" "cloudfront_cert" {
  provider    = aws.us_east_1
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}

# ============================================================
# CloudFront WAF — must live in us-east-1 (scope = CLOUDFRONT)
# ============================================================
# Subset of the rules from waf.tf (which is REGIONAL for the ALB):
# common rules + bad inputs + per-IP rate limit. Multipart-upload allowlist
# is intentionally omitted — CloudFront only serves the static SPA, not
# upload endpoints, so the relaxation that's needed on the ALB is not needed here.

resource "aws_wafv2_web_acl" "cloudfront" {
  provider    = aws.us_east_1
  name        = "${var.project}-waf-cloudfront"
  scope       = "CLOUDFRONT"
  description = "WAF para CloudFront (frontend SPA) RenoveJa+"

  default_action {
    allow {}
  }

  # AWS Managed Rules - Common
  rule {
    name     = "aws-common-rules"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-cf-common-rules"
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "aws-bad-inputs"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-cf-bad-inputs"
    }
  }

  # Rate limiting: 2000 req / 5 min por IP — generoso pois é SPA estática
  rule {
    name     = "rate-limit"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-cf-rate-limit"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-waf-cloudfront"
  }
}

resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "${var.project} frontend OAI"
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = aws_cloudfront_origin_access_identity.frontend.iam_arn }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  })
}

resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${var.project}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      if (uri.includes('.')) return request;
      request.uri = '/index.html';
      return request;
    }
  EOF
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  web_acl_id          = aws_wafv2_web_acl.cloudfront.arn

  aliases = [
    "www.renovejasaude.com.br",
    "admin.renovejasaude.com.br",
    "medico.renovejasaude.com.br",
  ]

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "s3-frontend"
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    min_ttl                = 86400
    default_ttl            = 604800
    max_ttl                = 31536000

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # NÃO usar custom_error_response para 403/404: quando um chunk JS (ex: /assets/DoctorNotifications-XXX.js)
  # não existe, o S3 retorna 404. Se retornarmos index.html, o browser espera JS e recebe HTML → erro de MIME type.
  # O spa_rewrite (viewer-request) já trata SPA: rotas sem extensão (ex: /admin/medicos) são reescritas para /index.html.

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.cloudfront_cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
