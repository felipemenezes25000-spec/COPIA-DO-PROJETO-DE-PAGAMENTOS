# ============================================================
# Verifica o que existe na AWS (sa-east-1) e ajuda a subir o que falta
# Uso: .\aws-check-and-deploy.ps1
# Requer: AWS CLI configurado (aws configure)
# ============================================================

$ErrorActionPreference = "Stop"
$Region = "sa-east-1"

Write-Host ""
Write-Host "=== RenoveJa+ - Verificacao AWS (regiao $Region) ===" -ForegroundColor Cyan
Write-Host ""

# 1) AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Host "[OK] AWS CLI: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "[FALTA] AWS CLI nao encontrado. Instale: winget install Amazon.AWSCLI" -ForegroundColor Yellow
    exit 1
}

# 2) Credenciais
$identity = aws sts get-caller-identity --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FALTA] Credenciais AWS. Rode: aws configure" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Credenciais: conta configurada" -ForegroundColor Green

# 3) RDS
Write-Host "`n--- RDS (PostgreSQL) ---" -ForegroundColor Cyan
$rdsRaw = aws rds describe-db-instances --region $Region --output json 2>&1
if ($LASTEXITCODE -eq 0 -and $rdsRaw) {
    $rdsJson = $rdsRaw | ConvertFrom-Json
    foreach ($db in $rdsJson.DBInstances) {
        $addr = $db.Endpoint.Address; $port = $db.Endpoint.Port
        Write-Host "  $($db.DBInstanceIdentifier) - $($db.DBInstanceStatus) - ${addr}:${port} - DB: $($db.DBName)"
        if ($db.DBInstanceIdentifier -eq "renoveja-postgres") {
            Write-Host "    -> RenoveJa: use este para o projeto (criado pelo Terraform)" -ForegroundColor Green
        }
        if ($db.DBInstanceIdentifier -like "*minhaviajagem*") {
            Write-Host "    -> MinhaViajagem: outro projeto; pode usar para testes se criar DB renoveja nele" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  Nenhum RDS na regiao ou sem permissao." -ForegroundColor Gray
}

# 4) S3
Write-Host "`n--- Buckets S3 (RenoveJa espera: renoveja-*) ---" -ForegroundColor Cyan
$buckets = aws s3api list-buckets --query "Buckets[*].Name" --output text 2>&1
$expected = @("renoveja-prescriptions", "renoveja-certificates", "renoveja-avatars", "renoveja-transcripts", "renoveja-frontend")
foreach ($b in $expected) {
    if ($buckets -match $b) { Write-Host "  [OK] $b" -ForegroundColor Green }
    else { Write-Host "  [FALTA] $b" -ForegroundColor Yellow }
}
if ($buckets) {
    Write-Host "  Buckets na conta: $($buckets -replace '\s+', ', ')" -ForegroundColor Gray
}

# 5) ECS
Write-Host "`n--- ECS (Fargate) ---" -ForegroundColor Cyan
$ecsClusters = aws ecs list-clusters --region $Region --query "clusterArns[*]" --output text 2>&1
if ($ecsClusters -match "renoveja") {
    Write-Host "  [OK] Cluster renoveja encontrado" -ForegroundColor Green
} elseif ($ecsClusters) {
    Write-Host "  Clusters: $ecsClusters" -ForegroundColor Gray
} else {
    Write-Host "  [FALTA] Nenhum cluster ECS (Terraform cria renoveja-prod)" -ForegroundColor Yellow
}

# 6) ECR
Write-Host "`n--- ECR (imagem da API) ---" -ForegroundColor Cyan
$ecrRepos = aws ecr describe-repositories --region $Region --query "repositories[*].repositoryName" --output text 2>&1
if ($ecrRepos -match "renoveja-api") {
    Write-Host "  [OK] renoveja-api" -ForegroundColor Green
} else {
    Write-Host "  [FALTA] repositorio renoveja-api (Terraform cria)" -ForegroundColor Yellow
}

# Resumo e proximos passos
Write-Host "`n=== Proximos passos ===`n" -ForegroundColor Cyan

Write-Host "1. Se ainda nao subiu a infra:" -ForegroundColor White
Write-Host "   cd infra" -ForegroundColor Gray
Write-Host "   cp terraform.tfvars.example terraform.tfvars   # edite db_password e demais" -ForegroundColor Gray
Write-Host "   terraform init && terraform plan && terraform apply" -ForegroundColor Gray

Write-Host "`n2. Depois do Terraform (ou se usar RDS existente), aplicar schema no Postgres:" -ForegroundColor White
Write-Host "   Opcao A - RDS Query Editor (console AWS):" -ForegroundColor Gray
Write-Host "   Abra o RDS -> renoveja-postgres -> Query Editor, cole o conteudo de infra/schema.sql" -ForegroundColor Gray
Write-Host "   Opcao B - psql (se instalado):" -ForegroundColor Gray
Write-Host '   $env:PGPASSWORD="SUA_SENHA"; psql -h SEU_RDS_ENDPOINT -U postgres -d renoveja -f infra/schema.sql' -ForegroundColor Gray

Write-Host "`n3. Se o banco ja existir e so faltar colunas/tabelas, rode as migrations na ordem:" -ForegroundColor White
Write-Host "   infra/migrations/20260316_requests_missing_columns.sql" -ForegroundColor Gray
Write-Host "   infra/migrations/20260316_patients_consent_records.sql" -ForegroundColor Gray
Write-Host "   infra/migrations/20260316_encounters_medical_ai_careplans.sql" -ForegroundColor Gray

Write-Host ""
