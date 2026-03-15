# Instala Terraform via winget (Windows Package Manager)
# Execute como administrador se winget pedir

Write-Host "=== Instalando Terraform ===" -ForegroundColor Cyan

# Tenta winget primeiro
$winget = Get-Command winget -ErrorAction SilentlyContinue
if ($winget) {
    Write-Host "Instalando via winget..."
    winget install Hashicorp.Terraform --accept-package-agreements --accept-source-agreements
} else {
    # Fallback: download manual
    Write-Host "winget nao encontrado. Baixando manualmente..."
    $version = "1.10.4"
    $url = "https://releases.hashicorp.com/terraform/${version}/terraform_${version}_windows_amd64.zip"
    $zip = "$env:TEMP\terraform.zip"
    $dest = "C:\terraform"

    Invoke-WebRequest -Uri $url -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $dest -Force
    Remove-Item $zip

    # Adicionar ao PATH do usuario
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$dest*") {
        [Environment]::SetEnvironmentVariable("Path", "$userPath;$dest", "User")
        Write-Host "Adicionado $dest ao PATH do usuario"
    }
}

Write-Host ""
Write-Host "=== Verificando instalacao ===" -ForegroundColor Cyan
Write-Host "Feche e reabra o terminal, depois execute:"
Write-Host "  terraform --version"
Write-Host "  aws sts get-caller-identity"
Write-Host ""
Write-Host "Se aws configure ainda nao foi feito:"
Write-Host "  aws configure"
Write-Host "  (Region: sa-east-1, Output: json)"
