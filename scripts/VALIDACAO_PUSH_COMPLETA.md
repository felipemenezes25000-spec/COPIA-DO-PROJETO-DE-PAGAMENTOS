# Validação Completa — Push Notifications

**Data:** 2026-03-05

## 1. Configuração local ✅

| Item | Status | Detalhes |
|------|--------|----------|
| google-services.json | ✅ OK | project_id: renove-ja, package: com.renoveja.app |
| app.config.js → googleServicesFile | ✅ OK | Condicional quando arquivo existe |
| projectId EAS | ✅ OK | beb0f102-cc22-45a9-80a6-7e735968e6d2 |
| expo-notifications | ✅ OK | Plugin configurado |

## 2. API Backend ✅

| Item | Status | Detalhes |
|------|--------|----------|
| Health | ✅ OK | status: healthy, Supabase + Storage OK |
| Login | ✅ OK | contato@renovejasaude.com.br |
| POST /api/push-tokens/test | ✅ OK | 200 - "Push de teste enviado" |

## 3. Tokens de push ✅

| Item | Status | Detalhes |
|------|--------|----------|
| Token registrado | ✅ OK | 1 token Android ativo |
| Formato | ✅ OK | ExponentPushToken[...] |
| Usuário | ✅ OK | contato@renovejasaude.com.br |

## 4. Backend → Expo ✅

| Item | Status | Detalhes |
|------|--------|----------|
| URL Expo API | ✅ OK | https://exp.host/--/api/v2/push/send |
| Formato payload | ✅ OK | to, title, body, data, sound, priority, channelId |
| Resposta | ✅ OK | 200 (Expo aceita a requisição) |

## 5. EAS / Expo Dashboard ⚠️

| Item | Status | Detalhes |
|------|--------|----------|
| Credentials Android | ⚠️ Erro | "Something went wrong while loading Android credentials" |
| Credentials iOS | ⚠️ Erro | "Something went wrong while loading iOS credentials" |
| App Identifier | ⚠️ Verificar | Link "Add Application Identifier" visível — pode faltar com.renoveja.app |
| FCM v1 | ❓ Indeterminado | Não foi possível verificar (página de credenciais com erro) |

## 6. Possível causa do push não chegar no dispositivo

Se o push é enviado (API 200) mas **não chega no celular**:

1. **FCM v1 não configurado no EAS** — Expo aceita o push mas falha ao entregar ao FCM
2. **App Identifier não registrado** — EAS pode não ter com.renoveja.app configurado
3. **Expo Go** — Push não funciona no Expo Go (SDK 53+)
4. **Build antigo** — Fazer novo build após configurar FCM v1

## 7. Próximos passos

1. **Adicionar Application Identifier no EAS**
   - Credentials → Add Application Identifier → com.renoveja.app (Android)

2. **Configurar FCM v1**
   - Firebase Console → Project Settings → Service Accounts → Generate New Private Key
   - EAS: `npx eas credentials --platform android` → FCM v1 → Upload JSON

3. **Novo build**
   - `npx expo run:android` ou `eas build --platform android`

4. **Testar novamente**
   - Login no app (development build)
   - Configurações → Testar push

## 8. Comandos úteis

```powershell
# Validação local
.\scripts\validar-fcm-push.ps1

# Teste de push via API
$body = '{"email":"contato@renovejasaude.com.br","password":"Teste@123"}'
$login = Invoke-RestMethod -Uri "https://ola-jamal.onrender.com/api/auth/login" -Method POST -ContentType "application/json" -Body $body
Invoke-RestMethod -Uri "https://ola-jamal.onrender.com/api/push-tokens/test" -Method POST -Headers @{ "Authorization" = "Bearer $($login.token)" }
```
