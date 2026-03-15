# ============================================================
# Popula SSM Parameter Store com secrets do RenoveJá+
# Rode DEPOIS do terraform apply
# NAO commitar valores reais: use env vars ou preencha localmente.
# ============================================================

Write-Host "=== Populando SSM Parameter Store ===" -ForegroundColor Cyan
Write-Host "Regiao: sa-east-1" -ForegroundColor Gray
Write-Host ""

$env:AWS_PAGER = ''
$prefix = "/renoveja/prod"

function Put-Secret($name, $value, $type = "SecureString") {
    Write-Host "  $name" -NoNewline
    aws ssm put-parameter --name "$prefix/$name" --value $value --type $type --overwrite --region sa-east-1 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host " OK" -ForegroundColor Green }
    else { Write-Host " ERRO" -ForegroundColor Red }
}

Write-Host "[Daily.co]" -ForegroundColor Yellow
Put-Secret "DAILY_API_KEY" (if ($env:DAILY_API_KEY) { $env:DAILY_API_KEY } else { "REPLACE_ME_DAILY_API_KEY" })
Put-Secret "DAILY_DOMAIN" "renove" "String"
Put-Secret "DAILY_ROOM_PREFIX" "consult" "String"
Put-Secret "DAILY_ROOM_EXPIRY_MINUTES" "120" "String"

Write-Host ""
Write-Host "[Supabase]" -ForegroundColor Yellow
Put-Secret "Supabase__Url" (if ($env:SUPABASE_URL) { $env:SUPABASE_URL } else { "https://REPLACE_ME.supabase.co" })
Put-Secret "Supabase__ServiceKey" (if ($env:SUPABASE_SERVICE_KEY) { $env:SUPABASE_SERVICE_KEY } else { "REPLACE_ME_SUPABASE_SERVICE_KEY" })

Write-Host ""
Write-Host "[OpenAI]" -ForegroundColor Yellow
Put-Secret "OpenAI__ApiKey" (if ($env:OPENAI_API_KEY) { $env:OPENAI_API_KEY } else { "REPLACE_ME_OPENAI_API_KEY" })

Write-Host ""
Write-Host "[Certificado]" -ForegroundColor Yellow
Put-Secret "CertificateEncryption__Key" (if ($env:CERTIFICATE_ENCRYPTION_KEY) { $env:CERTIFICATE_ENCRYPTION_KEY } else { "REPLACE_ME_CERTIFICATE_KEY" })

Write-Host ""
Write-Host "[MercadoPago]" -ForegroundColor Yellow
Put-Secret "MercadoPago__AccessToken" (if ($env:MERCADOPAGO_ACCESS_TOKEN) { $env:MERCADOPAGO_ACCESS_TOKEN } else { "REPLACE_ME_MERCADOPAGO_ACCESS_TOKEN" })
Put-Secret "MercadoPago__PublicKey" (if ($env:MERCADOPAGO_PUBLIC_KEY) { $env:MERCADOPAGO_PUBLIC_KEY } else { "REPLACE_ME_MERCADOPAGO_PUBLIC_KEY" })
Put-Secret "MercadoPago__ClientId" (if ($env:MERCADOPAGO_CLIENT_ID) { $env:MERCADOPAGO_CLIENT_ID } else { "REPLACE_ME" }) "String"
Put-Secret "MercadoPago__ClientSecret" (if ($env:MERCADOPAGO_CLIENT_SECRET) { $env:MERCADOPAGO_CLIENT_SECRET } else { "REPLACE_ME_MERCADOPAGO_CLIENT_SECRET" })
Put-Secret "MercadoPago__WebhookSecret" (if ($env:MERCADOPAGO_WEBHOOK_SECRET) { $env:MERCADOPAGO_WEBHOOK_SECRET } else { "REPLACE_ME_MERCADOPAGO_WEBHOOK_SECRET" })

Write-Host ""
Write-Host "[API Config]" -ForegroundColor Yellow
# NOTA: esses URLs serao atualizados para o ALB real depois do deploy
Put-Secret "Api__BaseUrl" "https://api.renovejasaude.com.br" "String"
Put-Secret "Api__DocumentTokenSecret" (if ($env:API_DOCUMENT_TOKEN_SECRET) { $env:API_DOCUMENT_TOKEN_SECRET } else { "REPLACE_ME_MIN_32_CHARS" })
Put-Secret "Verification__BaseUrl" "https://api.renovejasaude.com.br/api/verify" "String"

Write-Host ""
Write-Host "[Google OAuth]" -ForegroundColor Yellow
Put-Secret "Google__ClientId" (if ($env:GOOGLE_CLIENT_ID) { $env:GOOGLE_CLIENT_ID } else { "REPLACE_ME_GOOGLE_CLIENT_ID" }) "String"

Write-Host ""
Write-Host "[MercadoPago Webhook URL]" -ForegroundColor Yellow
Put-Secret "MercadoPago__NotificationUrl" "https://api.renovejasaude.com.br/api/payments/webhook" "String"

Write-Host ""
Write-Host "=== Concluido ===" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo passo: aguardar terraform apply terminar, depois:" -ForegroundColor Cyan
Write-Host "  1. terraform output  (para ver endpoints)"
Write-Host "  2. docker build + push da imagem para ECR"
Write-Host "  3. atualizar task definition com secrets do SSM"
