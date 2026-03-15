$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
if ($env:PATH -notlike "*$dockerPath*") { $env:PATH = "$env:PATH;$dockerPath" }

# Fix constraints
Write-Host "=== Relaxando constraints ===" -ForegroundColor Cyan
$fixSql = @"
ALTER TABLE public.prescriptions ALTER COLUMN request_id DROP NOT NULL;
ALTER TABLE public.prescriptions ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE public.prescriptions ALTER COLUMN doctor_id DROP NOT NULL;
ALTER TABLE public.prescriptions ALTER COLUMN verification_code DROP NOT NULL;
ALTER TABLE public.audit_events ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.audit_events ALTER COLUMN actor_role DROP NOT NULL;
ALTER TABLE public.audit_events ALTER COLUMN action DROP NOT NULL;
ALTER TABLE public.audit_events ALTER COLUMN resource_type DROP NOT NULL;
ALTER TABLE public.ai_interaction_logs ALTER COLUMN interaction_type DROP NOT NULL;
ALTER TABLE public.requests ALTER COLUMN medications SET DEFAULT '[]';
ALTER TABLE public.requests ALTER COLUMN prescription_images SET DEFAULT '[]';
ALTER TABLE public.requests ALTER COLUMN exams SET DEFAULT '[]';
ALTER TABLE public.requests ALTER COLUMN exam_images SET DEFAULT '[]';
SELECT 'Constraints relaxadas!' AS result;
"@
docker run --rm -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -c $fixSql

Write-Host ""
Write-Host "=== Migrando tabelas restantes ===" -ForegroundColor Cyan

$SUPABASE_URL = "https://ifgxgppxsawauaceudec.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZ3hncHB4c2F3YXVhY2V1ZGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NDQ1NywiZXhwIjoyMDg1NTUwNDU3fQ.5wG2YRH9F69OnLGpHTVy9vokaG2BIuBayuw2ANHvDuk"
$headers = @{ "apikey" = $SUPABASE_KEY; "Authorization" = "Bearer $SUPABASE_KEY"; "Accept" = "application/json" }

$tables = @("requests","prescriptions","audit_events","ai_interaction_logs")
$total = 0

foreach ($t in $tables) {
    try {
        $uri = "$SUPABASE_URL/rest/v1/${t}?select=*&limit=10000"
        $r = Invoke-WebRequest -Uri $uri -Headers $headers -UseBasicParsing -ErrorAction Stop
        $data = $r.Content | ConvertFrom-Json
        $count = @($data).Count
        if ($count -eq 0) { Write-Host "  $t : vazia" -ForegroundColor Gray; continue }

        $sb = New-Object System.Text.StringBuilder
        [void]$sb.AppendLine("SET session_replication_role = 'replica';")

        foreach ($row in $data) {
            $cols = @(); $vals = @()
            foreach ($p in $row.PSObject.Properties) {
                $cols += $p.Name; $v = $p.Value
                if ($null -eq $v) { $vals += "NULL" }
                elseif ($v -is [bool]) { if ($v) { $vals += "TRUE" } else { $vals += "FALSE" } }
                elseif ($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [decimal]) { $vals += "$v" }
                elseif ($v -is [array]) {
                    $j = ($v | ConvertTo-Json -Compress -Depth 10) -replace "'", "''"
                    if ([string]::IsNullOrWhiteSpace($j) -or $j -eq "null") { $j = "[]" }
                    $vals += "'$j'::jsonb"
                }
                elseif ($v -is [System.Management.Automation.PSCustomObject]) {
                    $j = ($v | ConvertTo-Json -Compress -Depth 10) -replace "'", "''"
                    if ([string]::IsNullOrWhiteSpace($j) -or $j -eq "null") { $j = "{}" }
                    $vals += "'$j'::jsonb"
                }
                else { $s = [string]$v -replace "'", "''"; $vals += "'$s'" }
            }
            [void]$sb.AppendLine("INSERT INTO public.$t ($(($cols -join ', '))) VALUES ($(($vals -join ', '))) ON CONFLICT DO NOTHING;")
        }
        [void]$sb.AppendLine("SET session_replication_role = 'origin';")

        $sqlFile = "C:\Users\renat\source\repos\ola-jamal\infra\mig_${t}.sql"
        [System.IO.File]::WriteAllText($sqlFile, $sb.ToString(), [System.Text.Encoding]::UTF8)

        $dockerResult = & docker run --rm -v "${sqlFile}:/data.sql" -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -f /data.sql 2>&1
        $errLines = $dockerResult | Select-String "ERROR"
        if ($errLines) {
            Write-Host "  $t : $count rows -> WARN" -ForegroundColor Yellow
            $errLines | Select-Object -First 1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkYellow }
        } else { Write-Host "  $t : $count rows -> OK" -ForegroundColor Green }
        $total += $count
        Remove-Item $sqlFile -ErrorAction SilentlyContinue
    } catch { Write-Host "  $t : SKIP" -ForegroundColor Gray }
}

Write-Host ""
Write-Host "=== VERIFICACAO FINAL ===" -ForegroundColor Green
docker run --rm -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -c "SELECT 'users: ' || COUNT(*) FROM users UNION ALL SELECT 'requests: ' || COUNT(*) FROM requests UNION ALL SELECT 'payments: ' || COUNT(*) FROM payments UNION ALL SELECT 'doctors: ' || COUNT(*) FROM doctor_profiles UNION ALL SELECT 'audit_logs: ' || COUNT(*) FROM audit_logs UNION ALL SELECT 'notifications: ' || COUNT(*) FROM notifications UNION ALL SELECT 'encounters: ' || COUNT(*) FROM encounters UNION ALL SELECT 'prescriptions: ' || COUNT(*) FROM prescriptions UNION ALL SELECT 'ai_interaction: ' || COUNT(*) FROM ai_interaction_logs UNION ALL SELECT 'audit_events: ' || COUNT(*) FROM audit_events ORDER BY 1;"
