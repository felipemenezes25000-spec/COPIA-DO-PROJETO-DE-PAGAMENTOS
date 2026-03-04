<#
.SYNOPSIS
    Script completo de teste de transcrição (Whisper) - RenoveJa

.DESCRIPTION
    Gera áudio falado, verifica/inicia o backend e testa o endpoint de transcrição.
    Compatível com Windows PowerShell 5.1+.

.PARAMETER SkipBackendStart
    Não inicia o backend - assume que já está rodando.

.PARAMETER AudioFile
    Caminho para arquivo de áudio customizado (opcional).

.EXAMPLE
    .\run-transcription-test.ps1
    .\run-transcription-test.ps1 -SkipBackendStart
    .\run-transcription-test.ps1 -AudioFile "C:\meu-audio.wav"

.NOTES
    Requer: .NET SDK, OpenAI:ApiKey no .env, ASPNETCORE_ENVIRONMENT=Development
#>

[CmdletBinding()]
param(
    [switch]$SkipBackendStart = $false,
    [string]$AudioFile = ""
)

# Garante que o script funcione de qualquer diretório
$ErrorActionPreference = "Continue"
$script:ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
Set-Location $script:ScriptDir | Out-Null

$script:BackendDir = Split-Path -Parent $script:ScriptDir
$script:ApiDir = Join-Path $script:BackendDir "src\RenoveJa.Api"
$script:BaseUrl = "http://localhost:5000"
$script:HealthUrl = "$script:BaseUrl/api/health"
$script:TranscribeUrl = "$script:BaseUrl/api/consultation/transcribe-test"
$script:DefaultAudioFile = Join-Path $script:ScriptDir "test-transcription-audio.wav"
$script:BackendJob = $null

# Output com encoding correto para português
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Log {
    param([string]$Msg, [string]$Color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Msg" -ForegroundColor $Color
}

function Write-LogOk { param([string]$Msg) Write-Log $Msg "Green" }
function Write-LogErr { param([string]$Msg) Write-Log $Msg "Red" }
function Write-LogWarn { param([string]$Msg) Write-Log $Msg "Yellow" }
function Write-LogInfo { param([string]$Msg) Write-Log $Msg "Cyan" }

# =============================================================================
# ETAPA 0: VERIFICAÇÕES INICIAIS
# =============================================================================
Write-Log "========================================" "Magenta"
Write-Log "  TESTE DE TRANSCRICAO - RENOVEJA" "Magenta"
Write-Log "========================================" "Magenta"
Write-Log ""

# Verifica .NET SDK
try {
    $dotnetVersion = dotnet --version 2>$null
    if (-not $dotnetVersion) { throw "dotnet nao encontrado" }
    Write-LogInfo ".NET SDK: $dotnetVersion"
} catch {
    Write-LogErr ".NET SDK nao encontrado. Instale em: https://dotnet.microsoft.com/download"
    exit 1
}

# Verifica pasta da API
if (-not (Test-Path $script:ApiDir)) {
    Write-LogErr "Pasta da API nao encontrada: $script:ApiDir"
    exit 1
}

# =============================================================================
# ETAPA 1: PREPARAR AUDIO
# =============================================================================
Write-Log ""
Write-Log "=== ETAPA 1: Preparar audio de teste ===" "Magenta"

if ($AudioFile -and (Test-Path $AudioFile)) {
    $script:AudioFilePath = $AudioFile
    Write-LogOk "Usando arquivo informado: $script:AudioFilePath"
} elseif (Test-Path $script:DefaultAudioFile) {
    $script:AudioFilePath = $script:DefaultAudioFile
    Write-LogOk "Arquivo de audio ja existe: $script:AudioFilePath"
} else {
    Write-LogInfo "Gerando audio falado em portugues (SpeechSynthesizer)..."
    try {
        Add-Type -AssemblyName System.Speech -ErrorAction Stop
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $voices = $synth.GetInstalledVoices()
        $ptVoice = $voices | Where-Object { $_.VoiceInfo.Culture.Name -like "pt*" } | Select-Object -First 1
        if ($ptVoice) {
            $synth.SelectVoice($ptVoice.VoiceInfo.Name)
            Write-LogInfo "Voz: $($ptVoice.VoiceInfo.Description)"
        }
        $synth.SetOutputToWaveFile($script:DefaultAudioFile)
        $synth.Speak("Ola, este e um teste de transcricao em portugues. O paciente esta com dor de cabeca ha tres dias e febre.")
        $synth.Dispose()
        $script:AudioFilePath = $script:DefaultAudioFile
        Write-LogOk "Audio gerado com sucesso"
    } catch {
        Write-LogWarn "SpeechSynthesizer falhou: $($_.Exception.Message)"
        Write-LogInfo "Tentando baixar audio de teste..."
        $urls = @(
            "https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_700KB.mp3",
            "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        )
        $downloaded = $false
        foreach ($url in $urls) {
            try {
                $ext = [System.IO.Path]::GetExtension(([uri]$url).AbsolutePath)
                if ([string]::IsNullOrEmpty($ext)) { $ext = ".mp3" }
                $outPath = Join-Path $script:ScriptDir "test-transcription-audio$ext"
                Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
                $script:AudioFilePath = $outPath
                $downloaded = $true
                Write-LogOk "Audio baixado: $script:AudioFilePath"
                break
            } catch {
                Write-LogWarn "Falha ao baixar: $url"
            }
        }
        if (-not $downloaded) {
            Write-LogErr "Nao foi possivel obter audio. Coloque um arquivo .wav ou .mp3 em: $script:DefaultAudioFile"
            exit 1
        }
    }
}

$fileSize = (Get-Item $script:AudioFilePath -ErrorAction SilentlyContinue).Length
if ($fileSize) {
    Write-LogInfo "Tamanho: $([math]::Round($fileSize/1024, 2)) KB"
}

# =============================================================================
# ETAPA 2: BACKEND
# =============================================================================
Write-Log ""
Write-Log "=== ETAPA 2: Backend ===" "Magenta"

$backendRunning = $false
try {
    $r = Invoke-WebRequest -Uri $script:HealthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($r.StatusCode -eq 200) {
        $backendRunning = $true
        Write-LogOk "Backend rodando em $script:BaseUrl"
    }
} catch {
    # Backend nao respondeu - normal se nao estiver rodando
}

if (-not $backendRunning -and -not $SkipBackendStart) {
    Write-LogInfo "Iniciando backend..."
    $apiDirFull = (Resolve-Path $script:ApiDir -ErrorAction SilentlyContinue).Path
    if (-not $apiDirFull) { $apiDirFull = $script:ApiDir }
    
    $script:BackendJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        $env:ASPNETCORE_ENVIRONMENT = "Development"
        dotnet run 2>&1
    } -ArgumentList $apiDirFull

    Write-LogInfo "Aguardando backend (ate 90 segundos)..."
    $ready = $false
    for ($i = 0; $i -lt 90; $i++) {
        Start-Sleep -Seconds 1
        try {
            $r = Invoke-WebRequest -Uri $script:HealthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($r -and $r.StatusCode -eq 200) {
                $ready = $true
                Write-LogOk "Backend pronto apos $($i+1) segundos"
                break
            }
        } catch { }
    }
    if (-not $ready) {
        Write-LogErr "Backend nao respondeu. Inicie manualmente em outro terminal:"
        Write-LogErr "  cd `"$script:ApiDir`""
        Write-LogErr "  `$env:ASPNETCORE_ENVIRONMENT='Development'; dotnet run"
        if ($script:BackendJob) {
            Write-LogInfo "Logs do backend:"
            Receive-Job $script:BackendJob -ErrorAction SilentlyContinue | Select-Object -First 20 | Write-Host
        }
        exit 1
    }
} elseif (-not $backendRunning -and $SkipBackendStart) {
    Write-LogErr "Backend NAO esta rodando!"
    Write-LogErr ""
    Write-LogErr "Inicie em outro terminal (PowerShell ou CMD):"
    Write-LogErr "  cd `"$script:ApiDir`""
    Write-LogErr "  `$env:ASPNETCORE_ENVIRONMENT='Development'"
    Write-LogErr "  dotnet run"
    Write-LogErr ""
    Write-LogErr "Aguarde 'Now listening on' e rode este script novamente."
    exit 1
}

# =============================================================================
# ETAPA 3: TESTE DE TRANSCRICAO
# =============================================================================
Write-Log ""
Write-Log "=== ETAPA 3: Enviar audio para transcricao ===" "Magenta"

$audioPath = (Resolve-Path $script:AudioFilePath -ErrorAction SilentlyContinue).Path
if (-not $audioPath) { $audioPath = $script:AudioFilePath }

Write-LogInfo "Enviando: $audioPath"
Write-LogInfo "URL: $script:TranscribeUrl"
Write-Log ""

$result = $null
$httpCode = $null
$responseBody = ""

# Tenta curl primeiro (mais confiavel para upload)
$curlPath = Get-Command curl.exe -ErrorAction SilentlyContinue
if ($curlPath) {
    try {
        $tempOut = [System.IO.Path]::GetTempFileName()
        # Path com barras normais para compatibilidade com curl no Windows
        $audioPathCurl = $audioPath -replace '\\', '/'
        $curlArgs = @(
            "-s", "-w", "%{http_code}",
            "-o", $tempOut,
            "-X", "POST",
            "-F", "file=@$audioPathCurl",
            "-H", "ngrok-skip-browser-warning: true",
            "-H", "Accept: application/json",
            $script:TranscribeUrl
        )
        $codeOutput = & curl.exe $curlArgs 2>&1
        $httpCode = $codeOutput -replace "`n.*", ""
        $responseBody = Get-Content $tempOut -Raw -ErrorAction SilentlyContinue
        Remove-Item $tempOut -Force -ErrorAction SilentlyContinue
    } catch {
        $curlPath = $null
    }
}

# Fallback: PowerShell 6+ tem -Form para upload; senao depende de curl
if (-not $httpCode -or $httpCode -eq "") {
    if ($PSVersionTable.PSVersion.Major -ge 6) {
        try {
            $form = @{ file = Get-Item $audioPath }
            $response = Invoke-RestMethod -Uri $script:TranscribeUrl -Method Post -Form $form -TimeoutSec 60
            $httpCode = "200"
            $responseBody = ($response | ConvertTo-Json -Compress)
        } catch {
            $ex = $_.Exception
            if ($ex.Response) {
                $reader = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                $reader.Close()
                $httpCode = [int]$ex.Response.StatusCode
            } else {
                Write-LogErr "Erro: $($ex.Message)"
                exit 1
            }
        }
    } else {
        Write-LogErr "curl.exe nao disponivel. Windows 10+ inclui curl."
        Write-LogErr "Alternativa: use PowerShell 7+ (pwsh) que suporta -Form"
        exit 1
    }
}

# =============================================================================
# RESULTADO
# =============================================================================
Write-Log ""
Write-Log "=== RESULTADO ===" "Magenta"

if ($httpCode -eq "200" -or $httpCode -eq 200) {
    try {
        $result = $responseBody | ConvertFrom-Json
        Write-LogOk "HTTP 200 - Resposta recebida!"
        Write-Log ""
        Write-Host "  Transcrito: $($result.transcribed)" -ForegroundColor $(if ($result.transcribed) { "Green" } else { "Yellow" })
        Write-Host "  Arquivo:   $($result.fileName)" -ForegroundColor Gray
        Write-Host "  Tamanho:   $($result.fileSize) bytes" -ForegroundColor Gray
        if ($result.text) {
            Write-Log ""
            Write-Log "TEXTO TRANSCRITO:" "Cyan"
            Write-Host "  $($result.text)" -ForegroundColor White
        }
        Write-Log ""
        if ($result.transcribed) {
            Write-LogOk "SUCESSO! Transcricao funcionando corretamente."
        } else {
            Write-LogWarn "Transcricao vazia. Verifique:"
            Write-LogWarn "  - OpenAI:ApiKey no arquivo .env da pasta RenoveJa.Api"
            Write-LogWarn "  - ASPNETCORE_ENVIRONMENT=Development no .env"
        }
    } catch {
        Write-LogErr "Resposta invalida: $responseBody"
    }
} else {
    Write-LogErr "Erro HTTP $httpCode"
    $preview = if ($responseBody -and $responseBody.Length -gt 500) { $responseBody.Substring(0, 500) + "..." } else { $responseBody }
        Write-LogErr "Resposta: $preview"
    if ($httpCode -eq "404") {
        Write-LogWarn ""
        Write-LogWarn "404 = Endpoint transcribe-test so existe em Development."
        Write-LogWarn "Verifique se o .env tem: ASPNETCORE_ENVIRONMENT=Development"
    }
}

# =============================================================================
# LIMPEZA
# =============================================================================
if ($script:BackendJob) {
    Write-Log ""
    Write-Log "Parando backend iniciado pelo script..." "Yellow"
    Stop-Job $script:BackendJob -ErrorAction SilentlyContinue
    Remove-Job $script:BackendJob -Force -ErrorAction SilentlyContinue
}

Write-Log ""
Write-Log "========================================" "Magenta"
Write-Log "  FIM DO TESTE" "Magenta"
Write-Log "========================================" "Magenta"
