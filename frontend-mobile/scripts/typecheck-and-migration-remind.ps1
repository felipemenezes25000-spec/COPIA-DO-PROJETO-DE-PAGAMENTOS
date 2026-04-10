# ============================================================
# 1) Typecheck do frontend-mobile (só erros TS)
# 2) Lembrete: migration de índices no RDS
# Uso: .\typecheck-and-migration-remind.ps1
# ============================================================

$Root = Split-Path (Split-Path $PSScriptRoot)
Set-Location (Join-Path $Root "frontend-mobile")

Write-Host ""
Write-Host "--- frontend-mobile: typecheck ---" -ForegroundColor Cyan
$out = npx tsc --noEmit 2>&1
$errors = $out | Where-Object { $_ -match "error TS" }
if ($errors) {
    $errors | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host ""
    exit 1
}
Write-Host "Nenhum erro TS." -ForegroundColor Green

Write-Host ""
Write-Host "--- Migration SQL (RDS) ---" -ForegroundColor Cyan
Write-Host "Quando for aplicar no banco, rode no RDS Query Editor (ou psql):" -ForegroundColor Gray
$migrationPath = Join-Path $Root "backend-dotnet\docs\migrations\add_composite_indexes_perf.sql"
Write-Host "  $migrationPath" -ForegroundColor Gray
Write-Host "  (indices compostos para paginacao real em requests)" -ForegroundColor Gray
Write-Host ""
