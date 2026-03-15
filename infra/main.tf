terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Após criar o bucket S3 para state, descomente:
  # backend "s3" {
  #   bucket  = "renoveja-terraform-state"
  #   key     = "prod/terraform.tfstate"
  #   region  = "sa-east-1"
  #   encrypt = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "renoveja"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
