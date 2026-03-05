# Configurar FCM v1 para Push Notifications
# Execute: .\scripts\configurar-fcm-v1.ps1
#
# PREREQUISITOS:
# 1. Firebase Console: Project Settings > Service Accounts > Generate New Private Key (JSON)
# 2. Salve o arquivo JSON em local seguro

$ErrorActionPreference = "Stop"
$frontend = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "frontend-mobile"
$firebaseUrl = "https://console.firebase.google.com/project/renove-ja/settings/serviceaccounts/adminsdk"

Write-Host "`n=== Configurar FCM v1 - RenoveJa ===`n" -ForegroundColor Cyan

# 1. Verificar login EAS
Write-Host "1. Verificando login no EAS..." -ForegroundColor Yellow
Push-Location $frontend
try {
    $whoami = npx --yes eas-cli whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Faca login: npx eas-cli login" -ForegroundColor Red
        exit 1
    }
    Write-Host "   Logado: $($whoami -join ' ')" -ForegroundColor Green
} finally {
    Pop-Location
}

# 2. Abrir Firebase Console
Write-Host "`n2. Abrindo Firebase Console (Service Accounts)..." -ForegroundColor Yellow
Start-Process $firebaseUrl
Write-Host "   - Clique em 'Generate New Private Key'" -ForegroundColor Gray
Write-Host "   - Salve o JSON (ex: renove-ja-fcm-key.json)" -ForegroundColor Gray
Write-Host ""

# 3. Executar EAS credentials
Write-Host "3. Execute o comando abaixo (interativo):" -ForegroundColor Yellow
Write-Host "   cd frontend-mobile" -ForegroundColor Cyan
Write-Host "   npx eas-cli credentials --platform android" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Selecione: production > Google Service Account > FCM v1 > Upload a new service account key" -ForegroundColor Gray
Write-Host "   Informe o caminho do JSON quando solicitado." -ForegroundColor Gray
Write-Host ""

# 4. Executar EAS credentials se --run foi passado
if ($args -contains "--run") {
    Write-Host "4. Executando EAS credentials (interativo)..." -ForegroundColor Yellow
    Push-Location $frontend
    npx --yes eas-cli credentials --platform android
    Pop-Location
} else {
    Write-Host "4. Para executar EAS credentials: .\scripts\configurar-fcm-v1.ps1 --run" -ForegroundColor Gray
}
Write-Host ""
