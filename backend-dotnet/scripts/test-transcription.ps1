# Script para testar transcrição (Whisper) via endpoint /api/consultation/transcribe-test
# Requer: backend rodando em Development, OpenAI:ApiKey configurada
# Uso: .\test-transcription.ps1 -AudioFile "caminho\para\audio.m4a"
# Com token (médico): .\test-transcription.ps1 -AudioFile "audio.m4a" -Token "eyJ..."

param(
    [Parameter(Mandatory=$true)]
    [string]$AudioFile,
    [string]$Token = "",
    [string]$BaseUrl = "http://localhost:5000"
)

if (-not (Test-Path $AudioFile)) {
    Write-Error "Arquivo não encontrado: $AudioFile"
    exit 1
}

$uri = "$BaseUrl/api/consultation/transcribe-test"
$headers = @("ngrok-skip-browser-warning: true")
if ($Token) {
    $headers += "Authorization: Bearer $Token"
}

# Usa curl (disponível no Windows 10+ e Git Bash)
$curlArgs = @("-s", "-X", "POST", "-F", "file=@$AudioFile", $uri)
foreach ($h in $headers) {
    $curlArgs += "-H", $h
}

Write-Host "Enviando $AudioFile para $uri ..." -ForegroundColor Cyan
try {
    $result = & curl @curlArgs 2>&1
    Write-Host "Resultado:" -ForegroundColor Green
    $result
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
    Write-Host "Certifique-se de que curl está instalado e o backend está rodando em Development."
}
