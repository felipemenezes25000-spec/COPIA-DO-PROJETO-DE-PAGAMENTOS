# ============================================================
# Deploy Frontend Web para S3 + CloudFront
# ============================================================

$ErrorActionPreference = "Stop"
$env:AWS_PAGER = ''

$REGION = "sa-east-1"
$S3_BUCKET = "renoveja-frontend-web"
$CF_DISTRIBUTION = "EXWM1ERYI9GZL"

Write-Host "=== 1. Build do Frontend ===" -ForegroundColor Cyan
Set-Location C:\Users\renat\source\repos\ola-jamal\frontend-web

# Usa .env.production
Write-Host "Usando .env.production (API_URL = ALB)" -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO no build!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== 2. Upload para S3 ===" -ForegroundColor Cyan

# Sync do dist para S3
aws s3 sync dist/ "s3://$S3_BUCKET" --delete --region $REGION

# Cache headers para assets (hash no nome = cache longo)
aws s3 cp "s3://$S3_BUCKET/assets/" "s3://$S3_BUCKET/assets/" --recursive --metadata-directive REPLACE --cache-control "max-age=31536000,public" --region $REGION

# index.html sem cache (SPA reload)
aws s3 cp "s3://$S3_BUCKET/index.html" "s3://$S3_BUCKET/index.html" --metadata-directive REPLACE --cache-control "no-cache,no-store,must-revalidate" --content-type "text/html" --region $REGION

Write-Host ""
Write-Host "=== 3. Invalidando cache CloudFront ===" -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $CF_DISTRIBUTION --paths "/*" --region us-east-1

Write-Host ""
Write-Host "=== Concluido ===" -ForegroundColor Green
Write-Host "Frontend disponivel em: https://d2u0wdu42tdqh3.cloudfront.net" -ForegroundColor Yellow

Set-Location C:\Users\renat\source\repos\ola-jamal
