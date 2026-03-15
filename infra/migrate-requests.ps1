$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
if ($env:PATH -notlike "*$dockerPath*") { $env:PATH = "$env:PATH;$dockerPath" }

$SUPABASE_URL = "https://ifgxgppxsawauaceudec.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZ3hncHB4c2F3YXVhY2V1ZGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NDQ1NywiZXhwIjoyMDg1NTUwNDU3fQ.5wG2YRH9F69OnLGpHTVy9vokaG2BIuBayuw2ANHvDuk"
$headers = @{ "apikey" = $SUPABASE_KEY; "Authorization" = "Bearer $SUPABASE_KEY"; "Accept" = "application/json" }

# Truncar requests e reinserir
docker run --rm -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -c "SET session_replication_role = 'replica'; DELETE FROM public.requests; SET session_replication_role = 'origin';"

$r = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/requests?select=*&limit=10000" -Headers $headers -UseBasicParsing
$data = $r.Content | ConvertFrom-Json
$count = @($data).Count
Write-Host "Requests do Supabase: $count" -ForegroundColor Cyan

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("SET session_replication_role = 'replica';")
foreach ($row in $data) {
    $cols = @(); $vals = @()
    foreach ($p in $row.PSObject.Properties) {
        $cols += $p.Name; $v = $p.Value
        if ($null -eq $v) { $vals += "NULL" }
        elseif ($v -is [bool]) { if ($v) { $vals += "TRUE" } else { $vals += "FALSE" } }
        elseif ($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [decimal]) { $vals += "$v" }
        elseif ($v -is [array]) { $j = ($v | ConvertTo-Json -Compress -Depth 10) -replace "'","''"; if (!$j -or $j -eq "null") { $j = "[]" }; $vals += "'$j'::jsonb" }
        elseif ($v -is [System.Management.Automation.PSCustomObject]) { $j = ($v | ConvertTo-Json -Compress -Depth 10) -replace "'","''"; if (!$j -or $j -eq "null") { $j = "{}" }; $vals += "'$j'::jsonb" }
        else { $s = [string]$v -replace "'","''"; $vals += "'$s'" }
    }
    [void]$sb.AppendLine("INSERT INTO public.requests ($(($cols -join ', '))) VALUES ($(($vals -join ', '))) ON CONFLICT DO NOTHING;")
}
[void]$sb.AppendLine("SET session_replication_role = 'origin';")

$sqlFile = "C:\Users\renat\source\repos\ola-jamal\infra\mig_requests_final.sql"
[System.IO.File]::WriteAllText($sqlFile, $sb.ToString(), [System.Text.Encoding]::UTF8)

$result = & docker run --rm -v "${sqlFile}:/data.sql" -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -f /data.sql 2>&1
$errLines = $result | Select-String "ERROR"
if ($errLines) { Write-Host "WARN:" -ForegroundColor Yellow; $errLines | Select-Object -First 3 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkYellow } }
else { Write-Host "requests: $count rows -> OK" -ForegroundColor Green }

Remove-Item $sqlFile -ErrorAction SilentlyContinue

Write-Host ""
docker run --rm -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -c "SELECT 'requests: ' || COUNT(*) FROM requests;"
