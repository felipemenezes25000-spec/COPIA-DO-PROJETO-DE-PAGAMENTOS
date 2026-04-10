# ============================================================
# Valida se o schema foi aplicado no RDS (tabelas e colunas-chave)
# Uso: mesma senha do apply-schema.ps1
#   $env:RENOVEJA_DB_PASSWORD = "sua_senha"
#   .\validate-schema.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$HostRds   = "renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com"
$Port      = "5432"
$Database  = "renoveja"
$User      = "postgres"

$Password = $env:RENOVEJA_DB_PASSWORD
if (-not $Password -and (Test-Path "$PSScriptRoot\.db-password")) {
    $Password = (Get-Content "$PSScriptRoot\.db-password" -Raw).Trim()
}
if (-not $Password) {
    Write-Host ""
    Write-Host "Defina a senha do RDS: `$env:RENOVEJA_DB_PASSWORD = ""sua_senha""" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "psql nao encontrado. Instale o PostgreSQL client." -ForegroundColor Yellow
    exit 1
}

# Tabelas esperadas (schema.sql)
$ExpectedTables = @(
    "users", "auth_tokens", "doctor_profiles", "patients", "requests", "payments", "chat_messages",
    "password_reset_tokens", "doctor_certificates", "audit_logs", "notifications", "video_rooms",
    "consultation_anamnesis", "push_tokens", "user_push_preferences", "product_prices", "payment_attempts",
    "webhook_events", "saved_cards", "consultation_time_bank", "consultation_time_bank_transactions",
    "prescriptions", "prescription_verification_logs", "encounters", "medical_documents", "consents",
    "consent_records", "audit_events", "ai_suggestions", "ai_interaction_logs", "doctor_patient_notes",
    "care_plans", "care_plan_tasks", "care_plan_task_files", "outbox_events"
)

# Colunas-chave para conferir (tabela.coluna)
$ExpectedColumns = @(
    "requests.short_code",
    "requests.doctor_call_connected_at",
    "requests.conduct_updated_by",
    "encounters.source_request_id",
    "medical_documents.source_request_id",
    "ai_suggestions.consultation_id"
)

$env:PGPASSWORD = $Password
try {
    Write-Host ""
    Write-Host "Validando schema em $HostRds / $Database ..." -ForegroundColor Cyan
    Write-Host ""

    # 1) Tabelas existentes
    $TablesSql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;"
    $ExistingTables = & psql -h $HostRds -p $Port -U $User -d $Database -t -A -c $TablesSql 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao conectar ou consultar: $ExistingTables" -ForegroundColor Red
        exit 1
    }
    $ExistingList = ($ExistingTables -split "`n" | ForEach-Object { $_.Trim() }) | Where-Object { $_ }

    $MissingTables = $ExpectedTables | Where-Object { $ExistingList -notcontains $_ }
    $FoundCount = $ExpectedTables.Count - $MissingTables.Count

    Write-Host "--- Tabelas ($FoundCount/$($ExpectedTables.Count)) ---" -ForegroundColor Cyan
    if ($MissingTables.Count -eq 0) {
        Write-Host "  Todas as tabelas existem." -ForegroundColor Green
    } else {
        foreach ($t in $MissingTables) { Write-Host "  [FALTA] $t" -ForegroundColor Red }
    }

    # 2) Colunas-chave
    Write-Host ""
    Write-Host "--- Colunas-chave ---" -ForegroundColor Cyan
    $MissingCols = @()
    foreach ($tc in $ExpectedColumns) {
        $tbl, $col = $tc -split "\.", 2
        $ColSql = "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='$tbl' AND column_name='$col' LIMIT 1;"
        $r = & psql -h $HostRds -p $Port -U $User -d $Database -t -A -c $ColSql 2>&1
        if ($r -match "1") {
            Write-Host "  [OK] $tbl.$col" -ForegroundColor Green
        } else {
            Write-Host "  [FALTA] $tbl.$col" -ForegroundColor Red
            $MissingCols += $tc
        }
    }

    Write-Host ""
    if ($MissingTables.Count -eq 0 -and $MissingCols.Count -eq 0) {
        Write-Host "Schema validado: tudo aplicado." -ForegroundColor Green
    } else {
        Write-Host "Faltam tabelas ou colunas. Rode apply-schema.ps1 ou as migrations em infra/migrations/." -ForegroundColor Yellow
        exit 1
    }
    Write-Host ""
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
