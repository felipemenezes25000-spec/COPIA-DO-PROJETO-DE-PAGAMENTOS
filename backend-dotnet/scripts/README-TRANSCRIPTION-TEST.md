# Teste de Transcrição (Whisper)

## Pré-requisitos

- **OpenAI:ApiKey** configurada em `appsettings.Development.json` ou `.env`
- **ASPNETCORE_ENVIRONMENT=Development** no `.env` (o endpoint de teste só existe em Development)

## Formas de executar

### Opção A: Duplo clique nos .bat (mais fácil)

| Arquivo | Uso |
|---------|-----|
| `run-transcription-test.bat` | Backend já rodando — só executa o teste |
| `run-transcription-test-full.bat` | Inicia o backend e executa o teste |

### Opção B: PowerShell

```powershell
cd c:\Users\anabe\Downloads\renovejatac\backend-dotnet\scripts
.\run-transcription-test.ps1 -SkipBackendStart
```

Ou com caminho completo (funciona de qualquer pasta):

```powershell
& "c:\Users\anabe\Downloads\renovejatac\backend-dotnet\scripts\run-transcription-test.ps1" -SkipBackendStart
```

### Opção C: Teste manual

1. **Inicie o backend:**
   ```powershell
   cd backend-dotnet\src\RenoveJa.Api
   $env:ASPNETCORE_ENVIRONMENT = "Development"
   dotnet run
   ```

2. **Em outro terminal, execute o teste:**
   ```powershell
   cd backend-dotnet\scripts
   .\run-transcription-test.ps1 -SkipBackendStart
   ```

## Logs para diagnóstico

O backend agora emite logs detalhados. Procure por:

- `[TranscribeTest]` — endpoint de teste
- `[Whisper]` — serviço de transcrição
- `[Transcribe]` — endpoint usado durante a consulta

**Se aparecer:** `[Whisper] OpenAI:ApiKey não configurada`
→ Configure `OpenAI__ApiKey` em variáveis de ambiente ou `appsettings.Development.json`

**Se aparecer:** `[Whisper] API OpenAI erro: StatusCode=401`
→ Chave inválida ou expirada. Gere nova em platform.openai.com

**Se aparecer:** `[Whisper] Resposta JSON sem texto ou vazio`
→ Áudio sem fala detectável ou formato não suportado

## Arquivo de áudio gerado

O script gera `test-transcription-audio.wav` na pasta `scripts`. Você pode reutilizá-lo ou substituir por outro arquivo com fala em português.
