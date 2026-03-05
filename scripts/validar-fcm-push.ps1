# Validação de configuração para Push Notifications (FCM v1)
# Execute: .\scripts\validar-fcm-push.ps1

$ErrorActionPreference = "Stop"
# Projeto = pasta pai de scripts/
$base = Resolve-Path (Join-Path $PSScriptRoot "..")
$frontend = Join-Path $base "frontend-mobile"

Write-Host "`n=== Validação FCM v1 / Push Notifications ===`n" -ForegroundColor Cyan

$ok = 0
$fail = 0

# 1. google-services.json
$gsPath = Join-Path $frontend "google-services.json"
if (Test-Path $gsPath) {
    Write-Host "[OK] google-services.json existe" -ForegroundColor Green
    $json = Get-Content $gsPath | ConvertFrom-Json
    Write-Host "     project_id: $($json.project_info.project_id)" -ForegroundColor Gray
    Write-Host "     project_number: $($json.project_info.project_number)" -ForegroundColor Gray
    $pkg = $json.client[0].client_info.android_client_info.package_name
    Write-Host "     package_name: $pkg" -ForegroundColor Gray
    if ($pkg -ne "com.renoveja.app") {
        Write-Host "     [AVISO] package_name deve ser com.renoveja.app" -ForegroundColor Yellow
    }
    $ok++
} else {
    Write-Host "[FALHA] google-services.json NAO encontrado em frontend-mobile/" -ForegroundColor Red
    Write-Host "        Baixe em: Firebase Console > Project Settings > app Android" -ForegroundColor Gray
    $fail++
}

# 2. app.config.js - googleServicesFile
$appConfig = Get-Content (Join-Path $frontend "app.config.js") -Raw
if ($appConfig -match "googleServicesFile") {
    Write-Host "[OK] app.config.js referencia googleServicesFile" -ForegroundColor Green
    $ok++
} else {
    Write-Host "[FALHA] app.config.js nao configurado com googleServicesFile" -ForegroundColor Red
    $fail++
}

# 3. projectId EAS
if ($appConfig -match "projectId.*beb0f102-cc22-45a9-80a6-7e735968e6d2") {
    Write-Host "[OK] projectId EAS configurado (beb0f102-cc22-45a9-80a6-7e735968e6d2)" -ForegroundColor Green
    $ok++
} else {
    Write-Host "[FALHA] projectId EAS ausente ou incorreto em app.config.js" -ForegroundColor Red
    $fail++
}

# 4. FCM v1 no EAS (requer verificação manual)
Write-Host "`n[MANUAL] FCM v1 no EAS:" -ForegroundColor Yellow
Write-Host "  As credenciais FCM v1 ficam no EAS (Expo) e NAO sao versionadas." -ForegroundColor Gray
Write-Host "  Para verificar:" -ForegroundColor Gray
Write-Host "  1. Acesse: https://expo.dev/accounts/_/projects/beb0f102-cc22-45a9-80a6-7e735968e6d2/credentials" -ForegroundColor Gray
Write-Host "  2. Faca login na conta Expo" -ForegroundColor Gray
Write-Host "  3. Selecione Android > Credentials" -ForegroundColor Gray
Write-Host "  4. Verifique se existe 'FCM v1 service account key' configurado" -ForegroundColor Gray
Write-Host "`n  Ou via CLI:" -ForegroundColor Gray
Write-Host "  cd frontend-mobile && npx eas credentials --platform android" -ForegroundColor Gray
Write-Host "  Depois: Android > production > Google Service Account > FCM v1" -ForegroundColor Gray
Write-Host ""

# Resumo
Write-Host "=== Resumo ===" -ForegroundColor Cyan
Write-Host "  Verificacoes locais: $ok OK, $fail falha(s)" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "  FCM v1 no EAS: verificar manualmente no link acima" -ForegroundColor Gray
Write-Host ""
