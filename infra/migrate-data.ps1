# ============================================================
# Migrar dados do Supabase para RDS via REST API
# ============================================================

$env:AWS_PAGER = ''
$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
if ($env:PATH -notlike "*$dockerPath*") { $env:PATH = "$env:PATH;$dockerPath" }

$SUPABASE_URL = "https://ifgxgppxsawauaceudec.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZ3hncHB4c2F3YXVhY2V1ZGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NDQ1NywiZXhwIjoyMDg1NTUwNDU3fQ.5wG2YRH9F69OnLGpHTVy9vokaG2BIuBayuw2ANHvDuk"

$RDS_HOST = "renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com"
$RDS_DB = "renoveja"
$RDS_USER = "postgres"
$RDS_PASS = "RnvJa2026#Pr0d!Sx9kL2m"

$headers = @{
    "apikey" = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Accept" = "application/json"
    "Prefer" = "count=exact"
}

# Tabelas para migrar (ordem respeitando foreign keys)
$tables = @(
    "users",
    "auth_tokens",
    "doctor_profiles",
    "requests",
    "payments",
    "chat_messages",
    "saved_cards",
    "password_reset_tokens",
    "doctor_certificates",
    "audit_logs",
    "notifications",
    "video_rooms",
    "consultation_anamnesis",
    "push_tokens",
    "user_push_preferences",
    "product_prices",
    "payment_attempts",
    "webhook_events",
    "consultation_time_bank",
    "consultation_time_bank_transactions",
    "prescriptions",
    "prescription_verification_logs",
    "encounters",
    "medical_documents",
    "consents",
    "audit_events",
    "ai_suggestions",
    "ai_interaction_logs",
    "doctor_patient_notes",
    "care_plans",
    "care_plan_tasks",
    "care_plan_task_files",
    "outbox_events"
)

Write-Host "=== Migrando dados Supabase -> RDS ===" -ForegroundColor Cyan
$totalMigrated = 0

foreach ($table in $tables) {
    try {
        # Buscar dados do Supabase (limite 10000 rows por tabela)
        $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/$table`?select=*&limit=10000" -Headers $headers -UseBasicParsing -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json

        $count = $data.Count
        if ($count -eq 0) {
            Write-Host "  $table : 0 rows (vazia)" -ForegroundColor Gray
            continue
        }

        # Salvar como JSON temporário
        $jsonPath = "C:\Users\renat\source\repos\ola-jamal\infra\temp_$table.json"
        $response.Content | Out-File -FilePath $jsonPath -Encoding UTF8

        Write-Host "  $table : $count rows" -ForegroundColor Yellow -NoNewline

        # Inserir no RDS via Docker + psql com COPY ou INSERT
        # Usar abordagem: gerar INSERT statements
        $insertSql = ""
        foreach ($row in $data) {
            $cols = @()
            $vals = @()
            foreach ($prop in $row.PSObject.Properties) {
                $cols += $prop.Name
                $val = $prop.Value
                if ($null -eq $val) {
                    $vals += "NULL"
                } elseif ($val -is [bool]) {
                    $vals += $(if ($val) { "TRUE" } else { "FALSE" })
                } elseif ($val -is [int] -or $val -is [long] -or $val -is [decimal] -or $val -is [double]) {
                    $vals += "$val"
                } elseif ($val -is [System.Collections.IEnumerable] -and $val -isnot [string]) {
                    $jsonVal = ($val | ConvertTo-Json -Compress -Depth 10) -replace "'", "''"
                    $vals += "'$jsonVal'"
                } else {
                    $escaped = "$val" -replace "'", "''"
                    $vals += "'$escaped'"
                }
            }
            $colStr = $cols -join ", "
            $valStr = $vals -join ", "
            $insertSql += "INSERT INTO public.$table ($colStr) VALUES ($valStr) ON CONFLICT DO NOTHING;`n"
        }

        # Salvar SQL
        $sqlPath = "C:\Users\renat\source\repos\ola-jamal\infra\temp_$table.sql"
        $insertSql | Out-File -FilePath $sqlPath -Encoding ASCII

        # Executar no RDS
        docker run --rm -v "${sqlPath}:/data.sql" -e PGPASSWORD="$RDS_PASS" postgres:15 psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB -f /data.sql 2>$null | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host " -> OK" -ForegroundColor Green
        } else {
            Write-Host " -> ERRO (pode ter conflitos)" -ForegroundColor Red
        }

        $totalMigrated += $count

        # Limpar temp
        Remove-Item $jsonPath -ErrorAction SilentlyContinue
        Remove-Item $sqlPath -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host "  $table : SKIP (tabela nao existe no Supabase ou erro)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== Migracao concluida: $totalMigrated rows ===" -ForegroundColor Green
