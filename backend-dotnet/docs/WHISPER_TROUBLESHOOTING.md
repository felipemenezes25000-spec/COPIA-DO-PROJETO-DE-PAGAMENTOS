# Transcrição — Whisper como fallback

**Transcrição principal:** Daily.co (Deepgram) no cliente.

**Fallback:** Quando Deepgram falha (evento `transcription-error` ou
`startTranscription` lança erro), o app grava áudio local e envia para
`POST /api/consultation/transcribe`, que usa Whisper (OpenAI).

- Requer `OpenAI__ApiKey` para Whisper funcionar.
- Para diagnóstico, veja `TRANSCRICAO_CONSULTA_DEBUG.md`.
