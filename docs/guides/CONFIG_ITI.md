# Configuração na AWS para validação ITI/Adobe

Este documento lista **todas as variáveis de ambiente** que devem ser configuradas na **API na AWS** (ECS Task Definition ou SSM Parameter Store) para que as receitas sejam aceitas pelo **validar.iti.gov.br** (ITI) e pelo **Adobe**.

---

## Variáveis obrigatórias para ITI/Adobe

Na **Task Definition da API (AWS)** ou no **Parameter Store** referenciado pela task:

| Key | Value | Uso |
|-----|-------|-----|
| `Api__BaseUrl` | `https://api.renovejasaude.com.br` | URL pública da API. Usada para montar a URL do PDF retornada ao ITI em `signatureFiles[].url`. **Use a URL exata da sua API na AWS** (sem barra no final). |
| `Verification__BaseUrl` | `https://api.renovejasaude.com.br/api/verify` | URL codificada no **QR Code** da receita. O ITI chama `GET {BaseUrl}/{id}?_format=application/validador-iti+json&_secretCode=CODIGO`. |
| `Verification__FrontendUrl` | `https://renovejasaude.com.br/verify` | URL do frontend de verificação (redirect de browsers e texto no PDF). |
| `Api__DocumentTokenSecret` | String de 32+ caracteres | Necessária para links de PDF no app/email. Sem ela, "Visualizar PDF Assinado" falha com 401. |

---

## Exemplo

```
Api__BaseUrl=https://api.renovejasaude.com.br
Verification__BaseUrl=https://api.renovejasaude.com.br/api/verify
Verification__FrontendUrl=https://renovejasaude.com.br/verify
Api__DocumentTokenSecret=minha-chave-secreta-prod-2025-com-pelo-menos-32-caracteres
```

---

## CORS (se o site estiver em outro domínio)

Se o frontend de verificação estiver em outro domínio, adicione em `Cors:AllowedOrigins` (appsettings ou variáveis):

| Key | Value |
|-----|-------|
| `Cors__AllowedOrigins__0` | `https://renovejasaude.com.br` |
| `Cors__AllowedOrigins__1` | URL exata do seu site (ex.: `https://seu-dominio.com`) |

---

## Checklist rápido

- [ ] `Api__BaseUrl` = URL da API na AWS (ex.: `https://api.renovejasaude.com.br`)
- [ ] `Verification__BaseUrl` = `{Api__BaseUrl}/api/verify`
- [ ] `Verification__FrontendUrl` = URL do site de verificação
- [ ] `Api__DocumentTokenSecret` = chave de 32+ caracteres
- [ ] CORS configurado com o domínio do site
- [ ] Nova versão da task/deploy após alterar variáveis

---

## Como testar após configurar

1. **QR Code / URL**: Escanear o QR Code de uma receita no validar.iti.gov.br. O ITI deve obter o JSON e baixar o PDF.
2. **Endpoint direto**: `GET https://api.renovejasaude.com.br/api/verify/{id}?type=prescricao&_format=application/validador-iti+json&_secretCode=123456` deve retornar JSON com `signatureFiles[].url`.

---

## Problemas comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| ITI não encontra a receita ao escanear QR | `Verification__BaseUrl` vazio ou errado | Definir `Verification__BaseUrl` = URL da API + `/api/verify` |
| ITI não consegue baixar o PDF | `Api__BaseUrl` vazio | Definir `Api__BaseUrl` = URL pública da API na AWS |
| 401 ao abrir link do PDF no navegador | `Api__DocumentTokenSecret` ausente | Adicionar chave de 32+ caracteres |
| CORS bloqueando requisições | Origem do site não permitida | Adicionar domínio em `Cors__AllowedOrigins__0`, etc. |
