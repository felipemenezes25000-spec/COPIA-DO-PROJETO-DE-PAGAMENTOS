# Build APK com GitHub Actions

Guia para gerar o APK do RenoveJá+ via GitHub Actions, conectado à API na AWS.

---

## Visão geral

| Componente | Onde roda | URL |
|------------|-----------|-----|
| **Backend (API)** | AWS (ECS/App Runner) | `https://api.renovejasaude.com.br` (ou sua URL) |
| **Build APK** | GitHub Actions | Workflow manual `Build Android APK` |
| **APK gerado** | Artifact do GitHub | Download após o build |

O APK usa `EXPO_PUBLIC_API_URL` para conectar à API. Essa URL é definida no momento do build (prebuild) e fica embutida no app.

---

## 1. Pré-requisitos

- [ ] Backend publicado na AWS e acessível (ex.: `https://api.renovejasaude.com.br`)
- [ ] Repositório no GitHub com o código
- [ ] Conta no Firebase (para `google-services.json` — push, login Google)

---

## 2. Configurar secrets no GitHub

Acesse: **GitHub → seu repositório → Settings → Secrets and variables → Actions**

Adicione os seguintes **secrets**:

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `EXPO_PUBLIC_API_URL` | **Sim** | URL da API na AWS (ex.: `https://api.renovejasaude.com.br`) — **sem barra no final** |
| `GOOGLE_SERVICES_JSON_BASE64` | **Sim** | Conteúdo do `google-services.json` em base64 |
| `ANDROID_KEYSTORE_BASE64` | Não (release) | Keystore em base64 para assinar o APK release |
| `ANDROID_KEYSTORE_PASSWORD` | Com keystore | Senha do keystore |
| `ANDROID_KEY_ALIAS` | Com keystore | Alias da chave (ex.: `renoveja`) |
| `ANDROID_KEY_PASSWORD` | Com keystore | Senha da chave |

### 2.1 Gerar `GOOGLE_SERVICES_JSON_BASE64`

1. Baixe o `google-services.json` do Firebase Console (Android app).
2. No terminal (PowerShell ou Git Bash):
   ```bash
   base64 -w 0 google-services.json
   ```
   ou no PowerShell:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json"))
   ```
3. Copie o resultado e cole no secret `GOOGLE_SERVICES_JSON_BASE64`.

### 2.2 Gerar keystore (opcional, para release assinado)

```bash
keytool -genkey -v -keystore release-keystore.jks -alias renoveja -keyalg RSA -keysize 2048 -validity 10000
```

Depois:
```bash
base64 -w 0 release-keystore.jks
```

Cole no secret `ANDROID_KEYSTORE_BASE64`. Se não configurar, o build release usará assinatura de debug (apenas para testes).

---

## 3. Disparar o build

1. Abra: **GitHub → seu repositório → Actions**
2. Selecione o workflow **`Build Android APK`**
3. Clique em **Run workflow**
4. Escolha:
   - **build_type**: `release` ou `debug`
   - **api_url**: deixe vazio para usar o secret `EXPO_PUBLIC_API_URL`, ou informe uma URL para testar
5. Clique em **Run workflow**

---

## 4. Baixar o APK

1. Após o build terminar (cerca de 10–15 min), clique no job **Build APK**
2. Na seção **Artifacts**, baixe `renoveja-release-apk` ou `renoveja-debug-apk`
3. Instale no celular: transfira o APK e abra o arquivo para instalar

---

## 5. Checklist de verificação

| Item | Verificação |
|------|-------------|
| API na AWS | `GET https://api.renovejasaude.com.br/api/health` retorna 200 |
| Secret `EXPO_PUBLIC_API_URL` | Mesma URL da API, sem barra no final |
| CORS na API | `Cors:AllowedOrigins` inclui `https://renovejasaude.com.br` (se aplicável) |

---

## 6. Erros comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `GOOGLE_SERVICES_JSON_BASE64 não configurado` | Secret ausente | Adicionar o secret no GitHub |
| `EXPO_PUBLIC_API_URL` vazio | Secret ausente ou não usado | Configurar o secret e deixar `api_url` vazio no workflow |
| App não conecta à API | URL incorreta ou CORS | Conferir `EXPO_PUBLIC_API_URL` e CORS na API (AWS) |
| Build release usa debug signing | Keystore não configurado | Adicionar os 4 secrets do keystore |
