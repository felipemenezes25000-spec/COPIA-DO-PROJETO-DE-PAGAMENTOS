# ============================================================
# S3 Buckets
# ============================================================

locals {
  private_buckets = {
    prescriptions = aws_s3_bucket.prescriptions.id
    certificates  = aws_s3_bucket.certificates.id
    avatars       = aws_s3_bucket.avatars.id
    transcripts   = aws_s3_bucket.transcripts.id
  }
}

resource "aws_s3_bucket" "prescriptions" {
  bucket = "${var.project}-prescriptions"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "certificates" {
  bucket = "${var.project}-certificates"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "avatars" {
  bucket = "${var.project}-avatars"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "transcripts" {
  bucket = "${var.project}-transcripts"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project}-frontend-web"
}

# Server-side encryption (AES256) for the public-facing frontend bucket.
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning for the frontend bucket — allows rollback of bad SPA deploys.
resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Block public access em buckets privados
resource "aws_s3_bucket_public_access_block" "private" {
  for_each = local.private_buckets

  bucket                  = each.value
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Block public access on frontend bucket (served via CloudFront OAI, not direct S3)
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versionamento em prescriptions e certificates
resource "aws_s3_bucket_versioning" "prescriptions" {
  bucket = aws_s3_bucket.prescriptions.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "certificates" {
  bucket = aws_s3_bucket.certificates.id
  versioning_configuration {
    status = "Enabled"
  }
}

# FIX M8: versionamento no bucket de avatares. Embora avatar não seja dado
# crítico como prescription/certificate, sem versioning qualquer sobrescrita
# acidental (bug de upload, ataque CSRF bem sucedido, dev rodando script
# de migração errado) destrói o avatar sem possibilidade de restore.
# Versioning S3 é free-tier até 2 GB e custa centavos por mês depois.
resource "aws_s3_bucket_versioning" "avatars" {
  bucket = aws_s3_bucket.avatars.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption para buckets privados (dados médicos sensíveis)
resource "aws_s3_bucket_server_side_encryption_configuration" "private" {
  for_each = local.private_buckets

  bucket = each.value
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Lifecycle: prescriptions — retenção 20 anos (CFM mínimo)
resource "aws_s3_bucket_lifecycle_configuration" "prescriptions" {
  bucket = aws_s3_bucket.prescriptions.id

  rule {
    id     = "archive-old-prescriptions"
    status = "Enabled"

    filter {}

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    transition {
      days          = 730
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 7300
    }
  }
}

# Lifecycle: transcripts — retenção 20 anos (prontuário CFM)
resource "aws_s3_bucket_lifecycle_configuration" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id

  rule {
    id     = "archive-old-transcripts"
    status = "Enabled"

    filter {}

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    transition {
      days          = 730
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 7300
    }
  }
}

# Lifecycle: certificates — retenção 20 anos (CFM)
resource "aws_s3_bucket_lifecycle_configuration" "certificates" {
  bucket = aws_s3_bucket.certificates.id

  rule {
    id     = "archive-old-certificates"
    status = "Enabled"

    filter {}

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    transition {
      days          = 730
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 7300
    }
  }
}

# Versionamento em transcripts (prontuário médico)
resource "aws_s3_bucket_versioning" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id
  versioning_configuration {
    status = "Enabled"
  }
}
