$env:AWS_PAGER = ''
$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
if ($env:PATH -notlike "*$dockerPath*") { $env:PATH = "$env:PATH;$dockerPath" }

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VALIDACAO COMPLETA - RenoveJa+ AWS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()

# 1. API Health
Write-Host "[1/8] API Health Check..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri https://api.renovejasaude.com.br/api/health -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    $health = $r.Content | ConvertFrom-Json
    if ($health.status -eq "healthy") {
        Write-Host " OK ($($health.status))" -ForegroundColor Green
    } else {
        Write-Host " DEGRADED ($($health.status))" -ForegroundColor Yellow
        $errors += "API health: $($health.status)"
    }
} catch {
    Write-Host " FALHOU ($($_.Exception.Message.Substring(0, [Math]::Min(60, $_.Exception.Message.Length))))" -ForegroundColor Red
    $errors += "API health: OFFLINE"
}

# 2. API Login endpoint
Write-Host "[2/8] API Auth endpoint..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri https://api.renovejasaude.com.br/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"test@test.com","password":"test"}' -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    Write-Host " OK (respondeu)" -ForegroundColor Green
} catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    if ($status -eq 401 -or $status -eq 400 -or $status -eq 422) {
        Write-Host " OK (retornou $status - esperado)" -ForegroundColor Green
    } elseif ($status -eq 503 -or $status -eq 502) {
        Write-Host " FALHOU ($status)" -ForegroundColor Red
        $errors += "API Login: $status"
    } else {
        Write-Host " OK (status $status)" -ForegroundColor Yellow
    }
}

# 3. Frontend www
Write-Host "[3/8] Frontend www..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri https://www.renovejasaude.com.br -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    Write-Host " OK ($($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    $errors += "Frontend www: OFFLINE"
}

# 4. Frontend admin
Write-Host "[4/8] Frontend admin..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri https://admin.renovejasaude.com.br -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    Write-Host " OK ($($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    $errors += "Frontend admin: OFFLINE"
}

# 5. Frontend medico
Write-Host "[5/8] Frontend medico..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri https://medico.renovejasaude.com.br -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    Write-Host " OK ($($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host " FALHOU" -ForegroundColor Red
    $errors += "Frontend medico: OFFLINE"
}

# 6. RDS PostgreSQL
Write-Host "[6/8] RDS PostgreSQL..." -NoNewline
$dbResult = docker run --rm -e PGPASSWORD="RnvJa2026#Pr0d!Sx9kL2m" postgres:15 psql -h renoveja-postgres.c54og6486w6w.sa-east-1.rds.amazonaws.com -U postgres -d renoveja -t -A -c "SELECT COUNT(*) FROM users;" 2>&1
$userCount = ($dbResult | Select-String "^\d+$" | Select-Object -First 1).ToString().Trim()
if ($userCount -gt 0) {
    Write-Host " OK ($userCount users)" -ForegroundColor Green
} else {
    Write-Host " FALHOU" -ForegroundColor Red
    $errors += "RDS: sem dados"
}

# 7. ECS Service
Write-Host "[7/8] ECS Service..." -NoNewline
$ecsStatus = aws ecs describe-services --cluster renoveja-prod --services renoveja-api --region sa-east-1 --query "services[0].{Status: status, Running: runningCount, Desired: desiredCount}" --output json 2>&1
$ecs = $ecsStatus | ConvertFrom-Json
if ($ecs.Status -eq "ACTIVE" -and $ecs.Running -gt 0) {
    Write-Host " OK (running: $($ecs.Running)/$($ecs.Desired))" -ForegroundColor Green
} else {
    Write-Host " PROBLEMA (running: $($ecs.Running)/$($ecs.Desired))" -ForegroundColor Red
    $errors += "ECS: running=$($ecs.Running) desired=$($ecs.Desired)"
}

# 8. S3 Buckets
Write-Host "[8/8] S3 Buckets..." -NoNewline
$buckets = @("renoveja-prescriptions", "renoveja-certificates", "renoveja-avatars", "renoveja-transcripts", "renoveja-frontend-web")
$allExist = $true
foreach ($b in $buckets) {
    $check = aws s3api head-bucket --bucket $b --region sa-east-1 2>&1
    if ($LASTEXITCODE -ne 0) { $allExist = $false; $errors += "S3: $b nao existe" }
}
if ($allExist) {
    Write-Host " OK (5/5 buckets)" -ForegroundColor Green
} else {
    Write-Host " PROBLEMA" -ForegroundColor Red
}

# ECS Logs (ultimas linhas de erro)
Write-Host ""
Write-Host "=== Ultimos logs ECS ===" -ForegroundColor Cyan
$streams = aws logs describe-log-streams --log-group-name /ecs/renoveja-api --order-by LastEventTime --descending --max-items 1 --region sa-east-1 --query "logStreams[0].logStreamName" --output json 2>&1
$streamName = ($streams | ConvertFrom-Json)
if ($streamName) {
    $logs = aws logs get-log-events --log-group-name /ecs/renoveja-api --log-stream-name $streamName --region sa-east-1 --limit 5 --query "events[*].message" --output json 2>&1
    $msgs = $logs | ConvertFrom-Json
    foreach ($m in $msgs) {
        $short = $m.Substring(0, [Math]::Min(150, $m.Length))
        if ($m -match "ERR|ERROR|Exception|FATAL") {
            Write-Host "  $short" -ForegroundColor Red
        } else {
            Write-Host "  $short" -ForegroundColor Gray
        }
    }
}

# Resultado final
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "  RESULTADO: TUDO OK!" -ForegroundColor Green
} else {
    Write-Host "  RESULTADO: $($errors.Count) PROBLEMA(S)" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "  - $e" -ForegroundColor Red
    }
}
Write-Host "============================================" -ForegroundColor Cyan
