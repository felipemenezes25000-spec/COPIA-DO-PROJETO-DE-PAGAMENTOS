<#
.SYNOPSIS
    Copia parametro SSM e atualiza ECS Task Definition para usar novo nome.

.DESCRIPTION
    1. Copia /renoveja/prod/Supabase__DatabaseUrl para /renoveja/prod/Database__ConnectionString no SSM
    2. Atualiza a ECS Task Definition para referenciar o novo parametro
    3. NAO deleta o parametro antigo (mantido para rollback)

.PARAMETER Apply
    Sem este switch, o script roda em dry-run (apenas mostra o que faria).

.PARAMETER Cluster
    Nome do cluster ECS. Padrao: renoveja-prod

.PARAMETER Service
    Nome do service ECS. Padrao: renoveja-api

.EXAMPLE
    # Dry-run (apenas mostra o que faria)
    .\aws-cleanup.ps1

    # Executar de verdade
    .\aws-cleanup.ps1 -Apply
#>

[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$Cluster = "renoveja-prod",
    [string]$Service = "renoveja-api"
)

$ErrorActionPreference = "Stop"

$OldParam = "/renoveja/prod/Supabase__DatabaseUrl"
$NewParam = "/renoveja/prod/Database__ConnectionString"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " AWS SSM + ECS Parameter Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $Apply) {
    Write-Host "[DRY-RUN] Nenhuma alteracao sera feita. Use -Apply para executar." -ForegroundColor Yellow
    Write-Host ""
}

# -------------------------------------------------------------------
# Step 1: Copiar valor do parametro SSM antigo para o novo
# -------------------------------------------------------------------
Write-Host "Step 1: Copiar SSM parameter" -ForegroundColor Green
Write-Host "  Origem:  $OldParam"
Write-Host "  Destino: $NewParam"

try {
    $oldValue = aws ssm get-parameter --name $OldParam --with-decryption --query "Parameter.Value" --output text 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERRO: Parametro '$OldParam' nao encontrado no SSM." -ForegroundColor Red
        Write-Host "  Saida: $oldValue" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Valor lido com sucesso ($(($oldValue).Length) chars)" -ForegroundColor Gray
}
catch {
    Write-Host "  ERRO ao ler parametro: $_" -ForegroundColor Red
    exit 1
}

# Verificar se o novo parametro ja existe
$newExists = $false
try {
    $existing = aws ssm get-parameter --name $NewParam --query "Parameter.Value" --output text 2>$null
    if ($LASTEXITCODE -eq 0) {
        $newExists = $true
        Write-Host "  Aviso: '$NewParam' ja existe no SSM." -ForegroundColor Yellow
    }
}
catch {
    # Parametro nao existe, OK
}

if ($Apply) {
    if ($newExists) {
        Write-Host "  Atualizando parametro existente..." -ForegroundColor Gray
        aws ssm put-parameter --name $NewParam --value $oldValue --type SecureString --overwrite | Out-Null
    }
    else {
        Write-Host "  Criando novo parametro..." -ForegroundColor Gray
        aws ssm put-parameter --name $NewParam --value $oldValue --type SecureString | Out-Null
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERRO ao criar/atualizar parametro no SSM." -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK: '$NewParam' criado/atualizado com sucesso." -ForegroundColor Green
}
else {
    Write-Host "  [DRY-RUN] Criaria '$NewParam' com o valor de '$OldParam'" -ForegroundColor Yellow
}

Write-Host ""

# -------------------------------------------------------------------
# Step 2: Atualizar ECS Task Definition
# -------------------------------------------------------------------
Write-Host "Step 2: Atualizar ECS Task Definition" -ForegroundColor Green

try {
    # Obter task definition atual do servico
    $serviceDesc = aws ecs describe-services --cluster $Cluster --services $Service --query "services[0].taskDefinition" --output text 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERRO: Servico '$Service' nao encontrado no cluster '$Cluster'." -ForegroundColor Red
        Write-Host "  Saida: $serviceDesc" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Task Definition atual: $serviceDesc" -ForegroundColor Gray

    # Obter JSON completo da task definition
    $taskDefJson = aws ecs describe-task-definition --task-definition $serviceDesc --output json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERRO ao descrever task definition." -ForegroundColor Red
        exit 1
    }

    # Verificar se o parametro antigo e referenciado
    if ($taskDefJson -match [regex]::Escape($OldParam)) {
        Write-Host "  Encontrada referencia a '$OldParam' na task definition." -ForegroundColor Gray

        if ($Apply) {
            # Substituir o nome do parametro no JSON
            $updatedJson = $taskDefJson -replace [regex]::Escape($OldParam), $NewParam

            # Extrair apenas os campos necessarios para register-task-definition
            $tempFile = [System.IO.Path]::GetTempFileName()
            $updatedJson | Out-File -FilePath $tempFile -Encoding utf8

            # Usar jq para extrair campos (se disponivel) ou PowerShell
            $family = ($updatedJson | ConvertFrom-Json).taskDefinition.family
            $containerDefs = ($updatedJson | ConvertFrom-Json).taskDefinition.containerDefinitions | ConvertTo-Json -Depth 10 -Compress
            $taskRoleArn = ($updatedJson | ConvertFrom-Json).taskDefinition.taskRoleArn
            $executionRoleArn = ($updatedJson | ConvertFrom-Json).taskDefinition.executionRoleArn
            $networkMode = ($updatedJson | ConvertFrom-Json).taskDefinition.networkMode
            $cpu = ($updatedJson | ConvertFrom-Json).taskDefinition.cpu
            $memory = ($updatedJson | ConvertFrom-Json).taskDefinition.memory
            $requiresCompat = ($updatedJson | ConvertFrom-Json).taskDefinition.requiresCompatibilities | ConvertTo-Json -Compress

            $registerArgs = @(
                "ecs", "register-task-definition",
                "--family", $family,
                "--container-definitions", $containerDefs,
                "--network-mode", $networkMode,
                "--requires-compatibilities", $requiresCompat
            )
            if ($taskRoleArn) { $registerArgs += @("--task-role-arn", $taskRoleArn) }
            if ($executionRoleArn) { $registerArgs += @("--execution-role-arn", $executionRoleArn) }
            if ($cpu) { $registerArgs += @("--cpu", $cpu) }
            if ($memory) { $registerArgs += @("--memory", $memory) }

            $newTaskDef = aws @registerArgs --query "taskDefinition.taskDefinitionArn" --output text 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  ERRO ao registrar nova task definition." -ForegroundColor Red
                Write-Host "  Saida: $newTaskDef" -ForegroundColor Red
                Remove-Item $tempFile -ErrorAction SilentlyContinue
                exit 1
            }
            Remove-Item $tempFile -ErrorAction SilentlyContinue

            Write-Host "  Nova Task Definition: $newTaskDef" -ForegroundColor Green

            # Atualizar o servico para usar a nova task definition
            aws ecs update-service --cluster $Cluster --service $Service --task-definition $newTaskDef --query "service.taskDefinition" --output text | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  ERRO ao atualizar servico ECS." -ForegroundColor Red
                exit 1
            }
            Write-Host "  OK: Servico '$Service' atualizado para usar nova task definition." -ForegroundColor Green
        }
        else {
            Write-Host "  [DRY-RUN] Registraria nova task definition substituindo:" -ForegroundColor Yellow
            Write-Host "    '$OldParam' -> '$NewParam'" -ForegroundColor Yellow
            Write-Host "  [DRY-RUN] Atualizaria servico '$Service' no cluster '$Cluster'" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  Nenhuma referencia a '$OldParam' encontrada na task definition." -ForegroundColor Yellow
        Write-Host "  A task definition pode ja estar usando '$NewParam' ou variavel de ambiente direta." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  ERRO ao processar ECS: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# -------------------------------------------------------------------
# Step 3: Nota sobre rollback
# -------------------------------------------------------------------
Write-Host "Step 3: Rollback" -ForegroundColor Green
Write-Host "  O parametro antigo '$OldParam' NAO foi deletado." -ForegroundColor Gray
Write-Host "  Para rollback, basta reverter a task definition para a versao anterior." -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($Apply) {
    Write-Host " Migracao concluida com sucesso!" -ForegroundColor Green
}
else {
    Write-Host " Dry-run concluido. Use -Apply para executar." -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
