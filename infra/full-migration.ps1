# ============================================================
# Script completo: Migrar dados + Trocar Storage + Rebuild + Deploy
# ============================================================

$ErrorActionPreference = "Continue"
$env:AWS_PAGER = ''
$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
if ($env:PATH -notlike "*$dockerPath*") { $env:PATH = "$env:PATH;$dockerPath" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " FASE 1: Migrar dados Supabase -> RDS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
& C:\Users\renat\source\repos\ola-jamal\infra\migrate-data.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " FASE 2: Rebuild + Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

cd C:\Users\renat\source\repos\ola-jamal
.\infra\deploy-ecr.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " FASE 3: Deploy ECS com task v3" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
aws ecs update-service --cluster renoveja-prod --service renoveja-api --force-new-deployment --region sa-east-1 --query "service.serviceName" --output text

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " CONCLUIDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verifique: https://api.renovejasaude.com.br/api/health"
Write-Host "pgAdmin: renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com"
