# ============================================================
# Atualizar CloudFront com aliases e certificado SSL
# ============================================================

$ErrorActionPreference = "Stop"
$env:AWS_PAGER = ''

$CF_ID = "EXWM1ERYI9GZL"
$CERT_ARN = "arn:aws:acm:us-east-1:064212133215:certificate/e0f1e5c6-b192-4d6d-9178-8f45b659045e"

Write-Host "=== 1. Obtendo config atual do CloudFront ===" -ForegroundColor Cyan
$config = aws cloudfront get-distribution-config --id $CF_ID --region us-east-1 --output json | ConvertFrom-Json
$etag = $config.ETag
$distConfig = $config.DistributionConfig

# Adicionar aliases
$distConfig.Aliases = @{
    Quantity = 3
    Items = @(
        "www.renovejasaude.com.br",
        "admin.renovejasaude.com.br",
        "medico.renovejasaude.com.br"
    )
}

# Trocar certificado
$distConfig.ViewerCertificate = @{
    ACMCertificateArn = $CERT_ARN
    SSLSupportMethod = "sni-only"
    MinimumProtocolVersion = "TLSv1.2_2021"
    CloudFrontDefaultCertificate = $false
}

# Salvar config atualizada
$distConfig | ConvertTo-Json -Depth 20 | Set-Content -Path "C:\Users\renat\source\repos\ola-jamal\infra\cf-config.json" -Encoding UTF8

Write-Host "=== 2. Aplicando update ===" -ForegroundColor Cyan
aws cloudfront update-distribution --id $CF_ID --if-match $etag --distribution-config file://infra/cf-config.json --region us-east-1 --query "Distribution.Status" --output text

Write-Host ""
Write-Host "=== Concluido ===" -ForegroundColor Green
Write-Host "CloudFront atualizado com HTTPS para www, admin e medico" -ForegroundColor Yellow
