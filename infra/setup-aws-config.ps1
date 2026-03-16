# ============================================================
# Configura AWS CLI para o projeto RenoveJa+
# Nao "pega" credenciais sozinho: voce precisa criar no Console
# e colar aqui quando o script pedir.
# ============================================================

$ErrorActionPreference = "Stop"

# Regiao padrao usada nos scripts de deploy (deploy-frontend, deploy-ecr, etc.)
$REGION = "sa-east-1"

Write-Host "=== Setup AWS CLI - RenoveJa+ ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verifica se AWS CLI esta instalado
$awsExe = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsExe) {
    Write-Host "AWS CLI nao encontrado. Instale primeiro:" -ForegroundColor Red
    Write-Host "  winget install Amazon.AWSCLI" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Depois abra um NOVO terminal e rode este script de novo." -ForegroundColor Gray
    exit 1
}

Write-Host "AWS CLI encontrado: $($awsExe.Source)" -ForegroundColor Green
aws --version
Write-Host ""

# 2. Onde pegar as credenciais (se ainda nao tiver)
Write-Host "Onde pegar Access Key e Secret:" -ForegroundColor Cyan
Write-Host "  1. Console AWS -> IAM -> Users -> seu usuario" -ForegroundColor Gray
Write-Host "  2. Aba 'Security credentials' -> Access keys -> Create access key" -ForegroundColor Gray
Write-Host "  3. Copie Access Key ID e Secret Access Key (o secret so aparece uma vez)" -ForegroundColor Gray
Write-Host ""

# 3. Configura: pede as credenciais e aplica regiao/output padrao
Write-Host "Agora vamos configurar. Quando pedir, cole:" -ForegroundColor Cyan
Write-Host "  - AWS Access Key ID" -ForegroundColor Gray
Write-Host "  - AWS Secret Access Key" -ForegroundColor Gray
Write-Host "  - Default region: use  sa-east-1  (Enter)" -ForegroundColor Gray
Write-Host "  - Default output: use  json  (Enter)" -ForegroundColor Gray
Write-Host ""

# Roda o configure interativo (usuario cola as chaves)
aws configure

# Ajusta regiao e output padrao para o projeto
aws configure set default.region $REGION
aws configure set default.output json

Write-Host ""
Write-Host "=== Verificando ===" -ForegroundColor Cyan
aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Configuracao OK. Conta e regiao prontos para deploy (deploy-frontend.ps1, deploy-ecr.ps1, etc.)." -ForegroundColor Green
} else {
    Write-Host "Falha ao validar. Confira Access Key e Secret em ~\.aws\credentials" -ForegroundColor Yellow
}
