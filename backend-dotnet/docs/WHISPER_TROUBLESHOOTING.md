# Whisper (OpenAI) — Transcrição não funciona

## Checklist rápido

1. **API Key configurada?**
   - Transcrição usa a **mesma chave** que GPT-4o (leitura de receitas, anamnese IA)
   - Local: `OpenAI__ApiKey` no `.env`
   - Render: `OpenAI__ApiKey` nas variáveis de ambiente
   - appsettings: `OpenAI:ApiKey`

2. **Log no backend**
   - `[Whisper] OpenAI:ApiKey não configurada` → chave ausente
   - `[Whisper] API erro: StatusCode=401` → chave inválida ou expirada
   - `[Whisper] Nenhuma fala detectada no áudio` → áudio sem voz ou muito curto
   - `[Whisper] Resposta sem texto útil` → Whisper retornou vazio

3. **Modelo**
   - Padrão: `whisper-1` (fixo no código)

4. **Formato do áudio**
   - Aceitos: mp3, mp4, mpeg, mpga, m4a, wav, webm (máx 25 MB)
   - Chunks muito pequenos (< 500 bytes) são ignorados no frontend

## Teste isolado

1. Backend em Development: `ASPNETCORE_ENVIRONMENT=Development`
2. App → Perfil médico → "Testar transcrição IA"
3. Grava 8s falando claramente
4. Verifique os logs do backend

## Gerar chave OpenAI

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie conta / faça login
3. API Keys → Create new secret key
4. Copie a chave e configure no backend (OpenAI__ApiKey)
