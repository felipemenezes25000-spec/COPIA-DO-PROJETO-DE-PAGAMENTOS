# Infraestrutura AWS — RenoveJá+

## Pré-requisitos

### 1. Instalar ferramentas

```powershell
# Terraform
winget install HashiCorp.Terraform

# AWS CLI
winget install Amazon.AWSCLI

# Reinicie o terminal após instalar
```

### 2. Configurar credenciais AWS

```powershell
aws configure
# AWS Access Key ID: (da sua conta)
# AWS Secret Access Key: (da sua conta)
# Default region: sa-east-1
# Default output: json
```

### 3. Criar bucket S3 para o state do Terraform (uma única vez)

```powershell
aws s3 mb s3://renoveja-terraform-state --region sa-east-1
aws s3api put-bucket-versioning --bucket renoveja-terraform-state --versioning-configuration Status=Enabled
```

### 4. Preencher variáveis

```powershell
cp terraform.tfvars.example terraform.tfvars
# Edite terraform.tfvars com seus valores reais
```

### 5. Aplicar

```powershell
cd infra
terraform init
terraform plan        # revise o que será criado
terraform apply       # confirme com 'yes'
```

## Estrutura

```
infra/
├── main.tf              # Provider + backend S3
├── variables.tf         # Variáveis de entrada
├── terraform.tfvars.example  # Template de valores
├── vpc.tf               # VPC, subnets, NAT Gateway
├── security_groups.tf   # Security groups
├── aurora.tf            # Aurora Serverless v2 + RDS Proxy
├── s3.tf                # Buckets S3
├── ecr.tf               # Container registry
├── ecs.tf               # ECS Fargate + ALB + auto-scaling
├── redis.tf             # ElastiCache Redis
├── cloudfront.tf        # CloudFront + S3 frontend
├── monitoring.tf        # CloudWatch + WAF
├── ssm.tf               # Secrets no Parameter Store
└── outputs.tf           # URLs e endpoints de saída
```

## Fases de deploy

1. `terraform apply -target=module...` não é usado — tudo é aplicado junto, mas os recursos só conectam quando configurados.
2. Após `terraform apply`, siga o plano de migração `PLANO_MIGRACAO_AWS_COM_DAILY.md` para migrar dados e trocar DNS.
"
