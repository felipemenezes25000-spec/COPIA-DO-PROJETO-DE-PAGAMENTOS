<#
.SYNOPSIS
    Testa geração de anamnese via endpoint anamnesis-test (apenas Development).

.DESCRIPTION
    Envia um transcript de exemplo para o backend e verifica se a anamnese é gerada.
    Pode iniciar o backend automaticamente com -StartBackend (usa perfil TestAnamnesis).

.PARAMETER BaseUrl
    URL base da API (padrão: http://localhost:5000).

.PARAMETER Transcript
    Transcript customizado. Se omitido, usa exemplo padrão.

.PARAMETER StartBackend
    Se especificado, inicia o backend com perfil TestAnamnesis antes de testar.

.EXAMPLE
    .\test-anamnesis.ps1
    .\test-anamnesis.ps1 -BaseUrl "http://localhost:5000"
    .\test-anamnesis.ps1 -Transcript "[Paciente] Estou com dor de cabeça há 3 dias e febre."
#>

[CmdletBinding()]
param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$Transcript = "",
    [switch]$StartBackend = $false
)

$ErrorActionPreference = "Stop"

$script:Transcript = if ($Transcript) {
    $Transcript
} else {
    @"
[Paciente] Bom dia doutor.
[Médico] Bom dia, como posso ajudar?
[Paciente] Estou com dor de cabeça há 3 dias. Começou de repente, é mais forte de lado direito.
[Paciente] Também tenho febre leve, de 37.5 às vezes.
[Paciente] Tomei paracetamol mas não melhorou muito.
[Paciente] Não tenho alergia a remédios. Uso losartana para pressão.
[Médico] Você notou algum problema de visão ou dormência?
[Paciente] Não, nada disso. Só a dor e a febre.
"@
}

function Write-Log { param([string]$Msg, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Msg" -ForegroundColor $Color
}

$uri = "$BaseUrl/api/consultation/anamnesis-test"
$body = @{ transcript = $script:Transcript } | ConvertTo-Json -Compress

$ApiDir = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "src\RenoveJa.Api"

if ($StartBackend) {
    Write-Log "Iniciando backend com perfil TestAnamnesis (Development)..." "Cyan"
    $job = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        $env:ASPNETCORE_ENVIRONMENT = "Development"
        dotnet run --launch-profile TestAnamnesis --no-build 2>&1
    } -ArgumentList $ApiDir
    Start-Sleep -Seconds 12
}

Write-Log "=== TESTE DE ANAMNESE ===" "Cyan"
Write-Log "URL: $uri" "Gray"
Write-Log "Transcript length: $($script:Transcript.Length) chars" "Gray"
Write-Log ""

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json" -TimeoutSec 90
    if ($response.success) {
        Write-Log "SUCESSO! Anamnese gerada." "Green"
        Write-Log "  - anamnesisJson: $($response.anamnesisJson.Length) chars" "Gray"
        Write-Log "  - suggestions: $($response.suggestions.Count)" "Gray"
        Write-Log "  - evidenceCount: $($response.evidenceCount)" "Gray"
        Write-Log ""
        Write-Log "Preview (primeiros 500 chars):" "Cyan"
        Write-Host $response.anamnesisJson.Substring(0, [Math]::Min(500, $response.anamnesisJson.Length)) -ForegroundColor White
        Write-Host "..."
        if ($StartBackend -and $job) { Stop-Job $job; Remove-Job $job }
        exit 0
    } else {
        Write-Log "Falha: $($response.message)" "Yellow"
        if ($StartBackend -and $job) { Stop-Job $job; Remove-Job $job }
        exit 1
    }
} catch {
    $statusCode = $null
    if ($_.Exception -and $_.Exception.Response) { $statusCode = $_.Exception.Response.StatusCode.value__ }
    if ($statusCode -eq 404) {
        Write-Log "404 - Endpoint não encontrado. Certifique-se de que ASPNETCORE_ENVIRONMENT=Development" "Red"
        Write-Log "  No .env: ASPNETCORE_ENVIRONMENT=Development" "Gray"
    } elseif ($statusCode -eq 400) {
        Write-Log "400 - Bad Request: $($_.ErrorDetails.Message)" "Red"
    } else {
        Write-Log "Erro: $_" "Red"
    }
    if ($StartBackend -and $job) { Stop-Job $job; Remove-Job $job }
    exit 1
}
