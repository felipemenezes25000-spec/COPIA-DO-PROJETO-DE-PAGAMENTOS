# Liberar criacao de chaves de conta de servico no projeto Renove Ja
# A politica iam.disableServiceAccountKeyCreation esta bloqueando.
#
# REQUISITOS:
# - Google Cloud SDK (gcloud) instalado: https://cloud.google.com/sdk/docs/install
# - Permissao: roles/orgpolicy.policyAdmin ou Organization Admin
# - Login: gcloud auth login

$projectId = "renove-ja"

Write-Host "`n=== Liberar criacao de chaves - Renove Ja ===`n" -ForegroundColor Cyan

# Verificar gcloud
$gcloud = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloud) {
    Write-Host "gcloud nao encontrado. Instale: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    Write-Host "Ou use o metodo manual abaixo." -ForegroundColor Gray
    Write-Host ""
    Write-Host "MANUAL: Acesse e adicione override no projeto:" -ForegroundColor Yellow
    Write-Host "https://console.cloud.google.com/iam-admin/orgpolicies/iam-disableServiceAccountKeyCreation?project=renove-ja" -ForegroundColor Gray
    Write-Host "Clique em 'Gerenciar politica' > 'Substituir politica do pai' > 'Desativar'" -ForegroundColor Gray
    Start-Process "https://console.cloud.google.com/iam-admin/orgpolicies/iam-disableServiceAccountKeyCreation?project=renove-ja"
    exit 1
}

Write-Host "1. Configurando projeto..." -ForegroundColor Yellow
gcloud config set project $projectId 2>&1 | Out-Null

Write-Host "2. Criando override da politica (enforce: false)..." -ForegroundColor Yellow
$yaml = @"
name: projects/$projectId/policies/iam.disableServiceAccountKeyCreation
spec:
  rules:
  - enforce: false
"@

$tempFile = [System.IO.Path]::GetTempFileName() + ".yaml"
$yaml | Out-File -FilePath $tempFile -Encoding utf8

try {
    gcloud org-policies set-policy $tempFile 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nPolitica atualizada. Aguarde 2-5 minutos para propagar." -ForegroundColor Green
        Write-Host "Depois, gere a chave no Firebase:" -ForegroundColor Gray
        Write-Host "https://console.firebase.google.com/project/renove-ja/settings/serviceaccounts/adminsdk" -ForegroundColor Gray
    } else {
        Write-Host "`nErro: Voce pode nao ter permissao (orgpolicy.policyAdmin)." -ForegroundColor Red
        Write-Host "Tente o metodo manual no link acima." -ForegroundColor Gray
    }
} finally {
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
}
