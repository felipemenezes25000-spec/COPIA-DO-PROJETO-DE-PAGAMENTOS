# ============================================================
# Build e Push da imagem Docker para ECR
# Rode da raiz do projeto: ola-jamal/
# ============================================================

$ErrorActionPreference = "Stop"
$env:AWS_PAGER = ''

# Adiciona Docker ao PATH se necessario
$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
if ($env:PATH -notlike "*$dockerPath*") {
    $env:PATH = "$env:PATH;$dockerPath"
}

$REGION = "sa-east-1"
$ACCOUNT = "064212133215"
$REPO = "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/renoveja-api"
$TAG = "latest"

Write-Host "=== 1. Verificando Docker ===" -ForegroundColor Cyan
docker version --format '{{.Server.Version}}' 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Desktop nao esta rodando! Abra o Docker Desktop e tente novamente." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== 2. Login no ECR ===" -ForegroundColor Cyan
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

Write-Host ""
Write-Host "=== 3. Build da imagem ===" -ForegroundColor Cyan
Write-Host "Contexto: raiz do repo (ola-jamal/)" -ForegroundColor Gray
docker build -t renoveja-api:$TAG -f backend-dotnet/Dockerfile .

Write-Host ""
Write-Host "=== 4. Tag para ECR ===" -ForegroundColor Cyan
docker tag renoveja-api:$TAG "${REPO}:${TAG}"

Write-Host ""
Write-Host "=== 5. Push para ECR ===" -ForegroundColor Cyan
docker push "${REPO}:${TAG}"

Write-Host ""
Write-Host "=== Concluido ===" -ForegroundColor Green
Write-Host "Imagem: ${REPO}:${TAG}" -ForegroundColor Yellow
Write-Host ""
Write-Host "Proximo passo:" -ForegroundColor Cyan
Write-Host "  aws ecs update-service --cluster renoveja-prod --service renoveja-api --force-new-deployment --region sa-east-1"
