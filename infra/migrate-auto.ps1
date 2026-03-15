$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
if ($env:PATH -notlike "*$dockerPath*") { $env:PATH = "$env:PATH;$dockerPath" }

$SUPABASE_URL = "https://ifgxgppxsawauaceudec.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZ3hncHB4c2F3YXVhY2V1ZGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NDQ1NywiZXhwIjoyMDg1NTUwNDU3fQ.5wG2YRH9F69OnLGpHTVy9vokaG2BIuBayuw2ANHvDuk"
$headers = @{ "apikey" = $SUPABASE_KEY; "Authorization" = "Bearer $SUPABASE_KEY"; "Accept" = "application/json" }

$tables = @("requests","prescriptions","encounters","audit_events","ai_interaction_logs")

Write-Host "=== Auto-detectando colunas faltantes ===" -ForegroundColor Cyan

foreach ($t in $tables) {
    # Pegar 1 row do Supabase para ver as colunas
    $r = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/${t}?select=*&limit=1" -Headers $headers -UseBasicParsing -ErrorAction Stop
    $data = $r.Content | ConvertFrom-Json
    if (@($data).Count -eq 0) { continue }
    $supabaseCols = @($data[0].PSObject.Properties.Name)

    # Pegar colunas do RDS
    $rdsCols = & docker run --rm -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -t -A -c "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='$t'" 2>&1
    $rdsColList = @($rdsCols | Where-Object { $_ -match '^\w' })

    # Encontrar colunas faltantes
    $missing = $supabaseCols | Where-Object { $_ -notin $rdsColList }
    if ($missing.Count -gt 0) {
        Write-Host "  $t : adicionando $($missing.Count) colunas: $($missing -join ', ')" -ForegroundColor Yellow
        foreach ($col in $missing) {
            $alterSql = "ALTER TABLE public.$t ADD COLUMN IF NOT EXISTS `"$col`" TEXT;"
            & docker run --rm -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -c $alterSql 2>&1 | Out-Null
        }
    } else {
        Write-Host "  $t : todas colunas OK" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Migrando dados ===" -ForegroundColor Cyan

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
                elseif ($v -is [array] -or $v -is [System.Management.Automation.PSCustomObject]) {
                    $j = ($v | ConvertTo-Json -Compress -Depth 10) -replace "'", "''"; $vals += "'$j'"
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
Write-Host "=== Verificacao final ===" -ForegroundColor Cyan
docker run --rm -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -c "SELECT 'users: ' || COUNT(*) FROM users UNION ALL SELECT 'requests: ' || COUNT(*) FROM requests UNION ALL SELECT 'payments: ' || COUNT(*) FROM payments UNION ALL SELECT 'doctors: ' || COUNT(*) FROM doctor_profiles UNION ALL SELECT 'audit_logs: ' || COUNT(*) FROM audit_logs UNION ALL SELECT 'notifications: ' || COUNT(*) FROM notifications UNION ALL SELECT 'encounters: ' || COUNT(*) FROM encounters UNION ALL SELECT 'prescriptions: ' || COUNT(*) FROM prescriptions UNION ALL SELECT 'ai_interaction: ' || COUNT(*) FROM ai_interaction_logs UNION ALL SELECT 'audit_events: ' || COUNT(*) FROM audit_events ORDER BY 1;"
