# ============================================================
# Configura AWS CLI a partir do CSV de access keys (AWS)
# Uso: .\setup-aws-from-csv.ps1 "C:\caminho\para\accessKeys.csv"
# ============================================================

param(
    [Parameter(Mandatory = $true)]
    [string]$CsvPath
)

$ErrorActionPreference = "Stop"
$REGION = "sa-east-1"

if (-not (Test-Path $CsvPath)) {
    Write-Host "Arquivo nao encontrado: $CsvPath" -ForegroundColor Red
    exit 1
}

$csv = Import-Csv $CsvPath
$row = $csv[0]
$accessKey = $row.'Access key ID'
$secretKey = $row.'Secret access key'

if (-not $accessKey -or -not $secretKey) {
    Write-Host "CSV deve ter colunas 'Access key ID' e 'Secret access key'." -ForegroundColor Red
    exit 1
}

$awsExe = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsExe) {
    Write-Host "AWS CLI nao encontrado. Instale: winget install Amazon.AWSCLI" -ForegroundColor Red
    exit 1
}

aws configure set aws_access_key_id $accessKey
aws configure set aws_secret_access_key $secretKey
aws configure set default.region $REGION
aws configure set default.output json

Write-Host "Configurado a partir de: $CsvPath" -ForegroundColor Green
Write-Host "Regiao padrao: $REGION" -ForegroundColor Gray
aws sts get-caller-identity
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK. Credenciais validas." -ForegroundColor Green
} else {
    Write-Host "Falha ao validar. Verifique o CSV." -ForegroundColor Yellow
}
