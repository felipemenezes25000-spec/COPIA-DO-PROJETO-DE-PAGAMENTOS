# Como configurar o login com Google (OAuth)

## 1. Google Cloud Console

1. Acesse: **https://console.cloud.google.com**
2. Crie um projeto ou selecione o projeto do RenoveJá.
3. No menu lateral: **APIs e serviços** → **Credenciais**.

---

## 2. Tela de consentimento OAuth (se ainda não fez)

- **APIs e serviços** → **Tela de consentimento OAuth**.
- Tipo: **Externo** (para testar com qualquer conta Google).
- Preencha: Nome do app (RenoveJá), e-mail de suporte, domínios autorizados (ex.: `renovejasaude.com.br`).
- Salve.

---

## 3. Criar credenciais OAuth 2.0

Você vai criar **três** tipos de cliente (ou só o que for usar):

### A) Cliente Web (obrigatório para o app)

- **Credenciais** → **Criar credenciais** → **ID do cliente OAuth**.
- Tipo: **Aplicativo da Web**.
- Nome: ex. `RenoveJá Web`.
- **URIs de redirecionamento autorizados** (para Expo/Web):
  - `https://auth.expo.io/@seu-usuario/renoveja-app`  
  - ou o que o Expo mostrar ao rodar o app (ele pode indicar a URL).
- Clique em **Criar**.
- Copie o **ID do cliente** (termina em `.apps.googleusercontent.com`).

→ Esse valor vai no **EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID** no `.env`.

---

### B) Cliente Android (para build Android)

- **Criar credenciais** → **ID do cliente OAuth**.
- Tipo: **Android**.
- Nome: ex. `RenoveJá Android`.
- **Nome do pacote**: `com.renoveja.app` (igual ao `package` do `app.config.js`).
- Para obter o **Impressão digital do certificado SHA-1**:
  - Debug: `cd android && ./gradlew signingReport` (ou use o que o EAS/Expo mostrar).
  - Ou no Android Studio: **Gradle** → **app** → **android** → **signingReport**.
- Crie e copie o **ID do cliente** (também termina em `.apps.googleusercontent.com`).

→ Esse valor vai no **EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID** no `.env`.

---

### C) Cliente iOS (para build iOS)

- **Criar credenciais** → **ID do cliente OAuth**.
- Tipo: **iOS**.
- Nome: ex. `RenoveJá iOS`.
- **ID do pacote**: `com.renoveja.app` (igual ao `bundleIdentifier` do `app.config.js`).
- Crie e copie o **ID do cliente**.

→ Esse valor vai no **EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID** no `.env`.

---

## 4. Colocar no `.env` do mobile

Abra o arquivo **`frontend-mobile/.env`** e preencha (troque pelos IDs que você copiou):

```env
# Login com Google — use os IDs da Google Cloud Console
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-yyyy.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-zzzz.apps.googleusercontent.com
```

- **Web** é obrigatório se o app (ou a tela de login web) usa Google.
- **Android** e **iOS** só são necessários se for fazer build nativo (Expo/Android e Expo/iOS).

---

## 5. Backend (API)

A API .NET também precisa do **mesmo Client ID Web** (ou um Client ID Web só para a API) nas configs:

- **Google:ClientId** no `appsettings.json` ou variável de ambiente.

O valor costuma ser o **mesmo** que o `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` quando o app envia o token para a API validar.

---

## Resumo

| Onde | O que colocar |
|------|----------------|
| **Google Cloud** | Criar projeto → Tela de consentimento → 3 credenciais OAuth (Web, Android, iOS). |
| **frontend-mobile/.env** | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, opcionalmente `_ANDROID` e `_IOS` com os IDs copiados. |
| **Backend** | `Google:ClientId` = mesmo Client ID Web (para validar o token do app). |

Depois de alterar o `.env`, faça um **novo build** do app para as variáveis serem aplicadas.

---

## Erro "DEVELOPER_ERROR" ao clicar em Google

Esse erro **sempre** indica desalinhamento entre o app e o Google Cloud Console. A causa mais comum é o **SHA-1** do certificado de assinatura não estar cadastrado.

### Passo a passo para corrigir

1. **Obter o SHA-1 do keystore que assina o app**

   - **Debug (Expo dev client, APK local):** use o `debug.keystore`:
     ```powershell
     keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
     Procure a linha `SHA1:` e copie o valor (ex.: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`).

   - **Release (EAS Build / Play Store):** use `eas credentials` ou o Play Console para obter o SHA-1.

2. **Adicionar o SHA-1 no Firebase Console**

   - Acesse [Firebase Console](https://console.firebase.google.com/) → projeto **renoveja-be43f**.
   - **Configurações do projeto** (ícone de engrenagem) → **Seus apps**.
   - Selecione o app Android (`com.renoveja.app`).
   - Clique em **Adicionar impressão digital** e cole o SHA-1.
   - Baixe o novo `google-services.json` e substitua em `android/app/google-services.json`.

3. **Verificar o cliente OAuth Android no Google Cloud Console**

   - Acesse [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → projeto do RenoveJá.
   - Em **OAuth 2.0 Client IDs**, localize o cliente **Android** (ex.: `RenoveJá Android`).
   - Confirme:
     - **Nome do pacote:** `com.renoveja.app`
     - **Impressão digital SHA-1:** inclua o SHA-1 do passo 1.
   - Se não existir, crie um novo cliente OAuth do tipo **Android** com esses dados.

4. **Firebase Auth**

   - No Firebase: **Build** → **Authentication** → **Sign-in method**.
   - Verifique se **Google** está habilitado.

5. **Rebuild do app**

   - Após alterar o `google-services.json` ou as credenciais, faça um novo build:
     ```bash
     npx expo prebuild --clean
     npx expo run:android
     ```
   - Ou, se usar EAS: `eas build --platform android --profile development` (ou o perfil que usar).

### Se o erro continuar: checklist completo

| # | Verificação | Como conferir |
|---|-------------|---------------|
| 1 | **Não use Expo Go** | Login com Google **não funciona** no Expo Go. Use `npx expo run:android` (development build) ou um APK gerado pelo EAS. |
| 2 | **Cliente Android no Google Cloud** | [Credenciais](https://console.cloud.google.com/apis/credentials) → **Criar credenciais** → **ID do cliente OAuth** → tipo **Android** → Pacote `com.renoveja.app` + SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. Se já existir, edite e confira o SHA-1. |
| 3 | **Projeto correto** | No Google Cloud, use o projeto **renoveja-be43f** (mesmo do Firebase). |
| 4 | **Rebuild completo** | Após qualquer alteração: `npx expo prebuild --clean` e depois `npx expo run:android`. Não basta recarregar o app. |
| 5 | **google-services.json na raiz** | O arquivo deve existir em `frontend-mobile/google-services.json` para o Expo prebuild. |

### Referência

- [Troubleshooting react-native-google-signin](https://react-native-google-signin.github.io/docs/troubleshooting)
- [Config Doctor](https://react-native-google-signin.github.io/docs/config-doctor) (ferramenta paga para extrair SHA-1 do APK/dispositivo)
