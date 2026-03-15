$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
if ($env:PATH -notlike "*$dockerPath*") { $env:PATH = "$env:PATH;$dockerPath" }
$env:AWS_PAGER = ''

$SUPABASE_URL = "https://ifgxgppxsawauaceudec.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZ3hncHB4c2F3YXVhY2V1ZGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk3NDQ1NywiZXhwIjoyMDg1NTUwNDU3fQ.5wG2YRH9F69OnLGpHTVy9vokaG2BIuBayuw2ANHvDuk"
$headers = @{
    "apikey" = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

# Mapping: Supabase bucket -> S3 bucket
$bucketMap = @{
    "prescription-images" = "renoveja-prescriptions"
    "prescriptions" = "renoveja-prescriptions"
    "certificates" = "renoveja-certificates"
    "avatars" = "renoveja-avatars"
    "consultation-transcripts" = "renoveja-transcripts"
}

$tempDir = "C:\Users\renat\source\repos\ola-jamal\infra\storage_migration"
if (!(Test-Path $tempDir)) { New-Item -ItemType Directory -Path $tempDir -Force | Out-Null }

$totalFiles = 0

foreach ($bucket in $bucketMap.Keys) {
    $s3Bucket = $bucketMap[$bucket]
    Write-Host "=== Bucket: $bucket -> s3://$s3Bucket ===" -ForegroundColor Cyan

    # List files in Supabase bucket
    try {
        $listUrl = "$SUPABASE_URL/storage/v1/object/list/$bucket"
        $body = @{ prefix = ""; limit = 1000; offset = 0 } | ConvertTo-Json
        $response = Invoke-WebRequest -Uri $listUrl -Headers $headers -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
        $files = $response.Content | ConvertFrom-Json
    }
    catch {
        Write-Host "  Erro ao listar bucket $bucket : $($_.Exception.Message.Substring(0, [Math]::Min(80, $_.Exception.Message.Length)))" -ForegroundColor Red
        continue
    }

    if (@($files).Count -eq 0) {
        Write-Host "  Vazio" -ForegroundColor Gray
        continue
    }

    foreach ($file in $files) {
        $name = $file.name
        if (!$name) { continue }

        # Skip folders - list their contents
        if ($file.id -eq $null -and $file.metadata -eq $null) {
            # It's a folder, list contents
            try {
                $subBody = @{ prefix = "$name/"; limit = 1000; offset = 0 } | ConvertTo-Json
                $subResponse = Invoke-WebRequest -Uri $listUrl -Headers $headers -Method POST -Body $subBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
                $subFiles = $subResponse.Content | ConvertFrom-Json
                foreach ($sf in $subFiles) {
                    if (!$sf.name -or $sf.id -eq $null) { continue }
                    $filePath = "$name/$($sf.name)"
                    $localFile = Join-Path $tempDir ($filePath -replace "/", "_")

                    # Download from Supabase
                    try {
                        $dlUrl = "$SUPABASE_URL/storage/v1/object/$bucket/$filePath"
                        Invoke-WebRequest -Uri $dlUrl -Headers $headers -OutFile $localFile -UseBasicParsing -ErrorAction Stop

                        # Upload to S3
                        aws s3 cp $localFile "s3://$s3Bucket/$filePath" --region sa-east-1 2>&1 | Out-Null
                        Write-Host "  $filePath -> OK" -ForegroundColor Green
                        $totalFiles++
                        Remove-Item $localFile -ErrorAction SilentlyContinue
                    }
                    catch {
                        Write-Host "  $filePath -> ERRO" -ForegroundColor Yellow
                    }
                }
            }
            catch {
                Write-Host "  Erro listando pasta $name" -ForegroundColor Yellow
            }
            continue
        }

        # It's a file at root level
        $localFile = Join-Path $tempDir $name
        try {
            $dlUrl = "$SUPABASE_URL/storage/v1/object/$bucket/$name"
            Invoke-WebRequest -Uri $dlUrl -Headers $headers -OutFile $localFile -UseBasicParsing -ErrorAction Stop
            aws s3 cp $localFile "s3://$s3Bucket/$name" --region sa-east-1 2>&1 | Out-Null
            Write-Host "  $name -> OK" -ForegroundColor Green
            $totalFiles++
            Remove-Item $localFile -ErrorAction SilentlyContinue
        }
        catch {
            Write-Host "  $name -> ERRO" -ForegroundColor Yellow
        }
    }
}

# Cleanup
Remove-Item $tempDir -Recurse -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Migracao Storage concluida: $totalFiles arquivos ===" -ForegroundColor Green

# Verify S3 contents
Write-Host ""
Write-Host "=== Arquivos no S3 ===" -ForegroundColor Cyan
foreach ($s3b in $bucketMap.Values | Select-Object -Unique) {
    $count = (aws s3 ls "s3://$s3b/" --recursive --region sa-east-1 2>&1 | Measure-Object -Line).Lines
    Write-Host "  s3://$s3b : $count arquivos" -ForegroundColor Yellow
}
