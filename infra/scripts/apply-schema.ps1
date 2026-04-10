# ============================================================
# Aplica infra/schema.sql no RDS renoveja-postgres
# Uso:
#   $env:RENOVEJA_DB_PASSWORD = "sua_senha"
#   .\apply-schema.ps1
# Ou (so aplica se tiver senha em arquivo local .db-password):
#   .\apply-schema.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$HostRds   = "renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com"
$Port      = "5432"
$Database  = "renoveja"
$User      = "postgres"

# Senha: env var ou arquivo local (nao commitado)
$Password = $env:RENOVEJA_DB_PASSWORD
if (-not $Password -and (Test-Path "$PSScriptRoot\.db-password")) {
    $Password = (Get-Content "$PSScriptRoot\.db-password" -Raw).Trim()
}
if (-not $Password) {
    Write-Host ""
    Write-Host "Defina a senha do RDS antes de rodar:" -ForegroundColor Yellow
    Write-Host '  $env:RENOVEJA_DB_PASSWORD = "sua_senha"' -ForegroundColor Gray
    Write-Host "Ou crie o arquivo (nao commitado): $PSScriptRoot\.db-password" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# PSScriptRoot = infra/scripts; parent = infra; schema = infra/schema.sql
$SchemaPath = Join-Path (Split-Path $PSScriptRoot) "schema.sql"
if (-not (Test-Path $SchemaPath)) {
    Write-Host "Arquivo nao encontrado: $SchemaPath" -ForegroundColor Red
    exit 1
}

# psql no PATH?
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host ""
    Write-Host "psql nao encontrado. Instale o PostgreSQL client ou use o RDS Query Editor no console AWS." -ForegroundColor Yellow
    Write-Host "  https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Aplicando schema em $HostRds / $Database ..." -ForegroundColor Cyan
$env:PGPASSWORD = $Password
try {
    & psql -h $HostRds -p $Port -U $User -d $Database -f $SchemaPath
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host ""
    Write-Host "Schema aplicado." -ForegroundColor Green
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
Write-Host ""
