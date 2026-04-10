# Tutorial completo: Verificação de Receita — verificar e ajustar tudo

Este guia cobre como configurar, publicar e validar o fluxo de **Verificação de Receita** quando o **front do validador** está na **AWS** e a **API** está na **AWS**.

---

## 1. Visão geral da arquitetura

| Componente | Onde roda | Função |
|-----------|-----------|--------|
| **Frontend (validador)** | AWS (CloudFront/S3 ou Amplify) | Página `/verify/:id` — usuário informa o código de 6 dígitos e vê o resultado (emitida em, assinada em, CRM, download). |
| **API (backend .NET)** | AWS (ECS/App Runner) | `POST /api/prescriptions/verify` — valida o código, retorna dados reais (sem mock). |

Fluxo:

1. Usuário acessa `https://renovejasaude.com.br/verify/{id}` (ou o domínio do site na AWS).
2. Informa o código de 6 dígitos e clica em **Validar**.
3. O front envia **POST** para `{VITE_API_URL}/api/prescriptions/verify` com `{ prescriptionId, verificationCode }`.
4. A API (na API (AWS)) valida e responde com `isValid`, datas, CRM completo, `downloadUrl`, etc.
5. O front exibe o resultado ou a mensagem de erro.

**Problema típico (405):** Se `VITE_API_URL` em produção apontar para o mesmo domínio do front (site estático), o POST vai para o servidor do front, que não tem essa rota → **405 Method Not Allowed**. A variável precisa apontar para a **URL da API na AWS**.

---

## 2. Pré-requisitos

- Frontend na **AWS** (CloudFront/S3 ou Amplify) e **AWS** (API).
- Build do frontend-web configurado (ex.: pipeline ou Amplify com root em `frontend-web`).
- API .NET publicada na AWS e acessível por HTTPS.
- Uma receita já **assinada** no sistema (para testar com código válido).

---

## 3. Backend (API na AWS)

### 3.1 Endpoint esperado

- **Método:** `POST`
- **URL:** `https://api.renovejasaude.com.br/api/prescriptions/verify`
- **Body (JSON):** `{ "prescriptionId": "uuid-da-receita", "verificationCode": "123456" }`
- **Resposta 200 (válida):** `{ "isValid": true, "status": "valid", "issuedAt": "...", "signedAt": "...", "patientName": "...", "doctorName": "...", "doctorCrm": "...", "downloadUrl": "..." }`
- **Resposta 200 (inválida):** `{ "isValid": false, "status": "invalid", "reason": "INVALID_CODE" }` (ou NOT_SIGNED, NOT_FOUND, REVOKED)

### 3.2 Variáveis de ambiente na API (AWS)

No **configuração da API (AWS)** → seu serviço (API) → **Environment**:

| Variável | Exemplo | Obrigatório |
|----------|---------|-------------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | Sim |
| `Api__BaseUrl` | `https://api.renovejasaude.com.br` (ou domínio customizado) | Sim (para montar `downloadUrl`) |
| `Api__DocumentTokenSecret` | Uma chave secreta com pelo menos 32 caracteres | Sim, para **baixar/visualizar PDF** pelo app (link abre no navegador sem Bearer). Sem ela, o link de documento vem sem token e ao abrir aparece "Token de autenticação inválido ou ausente." |
| AWS RDS, OpenAI, etc. | Conforme seu `.env` / documentação | Conforme app |

- **Api__BaseUrl:** usada para gerar o link de download do PDF na resposta (`downloadUrl`). Deve ser a URL pública pela qual a API é acessada.
- **Api__DocumentTokenSecret:** usada para assinar tokens de acesso a documentos. Quando o usuário toca em "Visualizar PDF Assinado" no app (ou abre o link em outra aba), o navegador faz GET em `/api/requests/{id}/document`. Sem essa variável, a API não gera `?token=...` no link e a abertura no navegador falha com 401. Configure na API (AWS) (ex.: uma string aleatória de 32+ caracteres).

### 3.3 CORS na API (AWS) (produção)

A API em produção usa a **DefaultPolicy** de CORS. Origens permitidas vêm de:

1. **Configuração:** seção `Cors:AllowedOrigins` (array no `appsettings.json` ou variáveis de ambiente).
2. **Fallback (se não houver config):**  
   `https://renovejasaude.com.br`, `https://www.renovejasaude.com.br`, `https://app.renovejasaude.com.br`.

**Se o site do validador estiver em outro domínio** (ex.: `https://seu-dominio.com`), adicione essa origem na API (AWS):

**Opção A – Variáveis de ambiente (API na AWS):**

- `Cors__AllowedOrigins__0` = `https://renovejasaude.com.br`
- `Cors__AllowedOrigins__1` = `https://seu-dominio.com` (ou o domínio exato do seu site)

(Ajuste os índices e valores conforme os domínios que você usa.)

**Opção B – appsettings.Production.json** (se a API usar):

```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://renovejasaude.com.br",
      "https://www.renovejasaude.com.br",
      "https://seu-dominio.com"
    ]
  }
}
```

Depois de alterar CORS ou env, faça **redeploy** do serviço na API (AWS).

### 3.4 Como verificar a API na API (AWS)

1. **Health (se existir):**  
   `GET https://api.renovejasaude.com.br/api/health` (ou o path que você tiver) → deve retornar 200.

2. **Verificação (POST):**  
   Use Postman, Insomnia ou `curl`:

   ```bash
   curl -X POST "https://api.renovejasaude.com.br/api/prescriptions/verify" \
     -H "Content-Type: application/json" \
     -d "{\"prescriptionId\": \"SEU-UUID-AQUI\", \"verificationCode\": \"123456\"}"
   ```

   - Código inválido → 200 com `"isValid": false` e `"reason": "INVALID_CODE"`.
   - Código válido → 200 com `"isValid": true` e os campos preenchidos.

3. **OPTIONS (CORS preflight):**  
   O navegador envia `OPTIONS` antes do POST. A API deve responder 200 com headers `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc. Se OPTIONS falhar ou não tiver esses headers, o POST pode ser bloqueado por CORS no browser.

---

## 4. Frontend (validador na AWS)

### 4.1 Variável obrigatória: VITE_API_URL

O front chama a API em `{VITE_API_URL}/api/prescriptions/verify`. Em **produção**, essa URL **tem que ser a da API (AWS)** (não o domínio do site estático).

No **build do frontend na AWS** (Amplify, CodeBuild ou pipeline que gera o bundle):
- Defina **VITE_API_URL** = `https://api.renovejasaude.com.br` (sem barra no final).
- Variáveis do Vite são embutidas no build; é necessário **novo build e deploy** após alterar.

### 4.2 Build do frontend

- **Root:** pasta do front (ex.: `frontend-web` no ola-jamal).
- **Build:** `npm run build` (ou o comando configurado).
- **Output:** `dist` (padrão do Vite). O conteúdo de `dist` é publicado no S3/CloudFront ou no Amplify.

### 4.3 Como verificar o front em produção

1. Abra o site em produção: `https://seu-dominio.com/verify/algum-uuid`.
2. Abra as **DevTools** (F12) → aba **Network**.
3. Digite um código de 6 dígitos e clique em **Validar**.
4. Procure a requisição para `.../api/prescriptions/verify`:
   - **Request URL** deve ser `https://api.renovejasaude.com.br/api/prescriptions/verify` (não o domínio do site).
   - **Method:** POST.
   - Se der **405**, a URL ainda está errada (provavelmente apontando para o próprio frontend).
   - Se der **0** ou bloqueio por CORS, verifique CORS na API (AWS) (ver seção 3.3).

---

## 5. Teste local

### 5.1 Front local + API local

1. **API:** na pasta do backend (ex.: `backend-dotnet/src/RenoveJa.Api`), rode a API (ex.: `dotnet run`). Anote a porta (ex.: 5000).
2. **Front:** na pasta do front (med-renew ou `frontend-web`), crie ou edite `.env`:
   - `VITE_API_URL=http://localhost:5000` (ou a porta correta).
3. Rode o front (`npm run dev`).
4. Acesse `http://localhost:8080/verify/{id}` (ou a URL que o Vite mostrar).
5. Valide: no Network, a chamada deve ir para `http://localhost:5000/api/prescriptions/verify`.

Em **Development**, a API usa a policy de CORS **Development**, que já inclui `http://localhost:8080`, `http://localhost:5173`, etc.

### 5.2 Front local + API na API (AWS) (prod)

1. No `.env` do front local: `VITE_API_URL=https://api.renovejasaude.com.br`.
2. Rode o front e teste em `/verify/:id`.
3. A requisição vai para o Render. Para funcionar, a origem `http://localhost:8080` (ou a que você usar) precisa estar permitida no CORS. Em produção a API usa a **DefaultPolicy**; se você não adicionar `http://localhost:8080` em `Cors:AllowedOrigins` na API (AWS), o browser pode bloquear por CORS. Use essa opção só para testes pontuais ou adicione localhost em produção temporariamente.

---

## 6. Checklist de verificação (produção)

Use esta lista para garantir que tudo está certo:

- [ ] **API (AWS)**
  - [ ] Serviço da API está **Live** (verde).
  - [ ] `Api__BaseUrl` = URL pública da API (ex.: `https://api.renovejasaude.com.br`).
  - [ ] CORS inclui o domínio exato do site do validador (ex.: `https://renovejasaude.com.br`, `https://seu-dominio.com`).
  - [ ] `POST /api/prescriptions/verify` responde 200 (com body válido ou inválido) quando testado com `curl`/Postman.

- [ ] **Frontend (AWS)**
  - [ ] `VITE_API_URL` no build = URL da API na API (AWS) (sem barra no final).
  - [ ] Depois de alterar a variável, **novo build e deploy** foi feito.
  - [ ] O site em produção está acessível e atualizado.

- [ ] **Browser (site em produção)**
  - [ ] Abrir `/verify/{id}` e **Validar** com um código.
  - [ ] No Network, a requisição vai para o domínio do **API (AWS)** (não do site estático).
  - [ ] Não aparece **405**; se aparecer, revisar `VITE_API_URL`.
  - [ ] Não aparece erro de CORS (bloqueio por origem); se aparecer, revisar CORS na API (AWS).
  - [ ] Código inválido → mensagem de erro clara (ex.: "Código inválido.").
  - [ ] Código válido → dados reais (Emitida em, Assinada em, CRM completo, botão de download se houver).

---

## 7. Troubleshooting

### Erro 405 (Method Not Allowed)

- **Causa:** O POST está indo para um servidor que não tem a rota ou não aceita POST (ex.: o próprio frontend estático).
- **Solução:** Garantir que `VITE_API_URL` em produção seja a **URL da API (AWS)**. Fazer novo build e deploy do frontend (AWS) após alterar.

### CORS (requisição bloqueada no browser)

- **Causa:** A origem do site (ex.: `https://renovejasaude.com.br`) não está em `Cors:AllowedOrigins` da API na API (AWS).
- **Solução:** Adicionar a origem exata (com `https://`, sem barra no final) nas variáveis de ambiente do API (AWS) (`Cors__AllowedOrigins__0`, etc.) ou em `appsettings.Production.json`, e redeployar a API.

### 404 no /api/prescriptions/verify

- **Causa:** Rota não existe ou API não está rodando na API (AWS) / URL errada.
- **Solução:** Confirmar que o backend é o do ola-jamal (ou o que contém o `PrescriptionsController`) e que a URL em `VITE_API_URL` é a correta e está acessível (testar no navegador ou com `curl`).

### “URL da API não configurada”

- **Causa:** No build do front, `VITE_API_URL` estava vazia (variável não definida no pipeline/Amplify ou não aplicada ao ambiente do deploy).
- **Solução:** Definir `VITE_API_URL` no ambiente de build (AWS Amplify/CodeBuild ou pipeline) e fazer **novo build e deploy**.

### Download do PDF não abre

- **Causa:** `downloadUrl` na resposta usa `Api__BaseUrl`; se estiver errada ou inacessível, o link quebra.
- **Solução:** Garantir `Api__BaseUrl` na API (AWS) = URL pública da API. O link será `{Api__BaseUrl}/api/verify/{id}/document?code=xxx`.

### "Token de autenticação inválido ou ausente" ao baixar/visualizar receita (app ou link)

- **Causa:** O usuário abre o link do PDF (ex.: "Visualizar PDF Assinado" no app ou link enviado por e-mail). A URL é `GET /api/requests/{id}/document`. Esse endpoint aceita **Bearer** (app autenticado) ou **?token=** (link para abrir no navegador). Se a variável **Api__DocumentTokenSecret** não estiver configurada na API (AWS), a API não gera o token e devolve um link sem `?token=`. Ao abrir no navegador (sem Bearer), a API responde 401 com essa mensagem.
- **Solução:** No Render, em **Environment**, adicionar **Api__DocumentTokenSecret** com uma string secreta de **pelo menos 32 caracteres** (ex.: uma chave aleatória em base64). Salvar e redeployar. Depois disso, os links de documento passam a incluir `?token=...` e abrem corretamente no navegador.

---

## 8. Resumo rápido

| Onde | O que verificar / ajustar |
|------|----------------------------|
| **API (AWS)** | API no ar; `Api__BaseUrl`; **Api__DocumentTokenSecret** (para links de PDF no app/email); CORS com o domínio do site; POST `/api/prescriptions/verify` respondendo. |
| **Frontend (AWS)** | `VITE_API_URL` = URL da API (AWS) no build; novo build e deploy após mudar. |
| **Browser** | Requisição POST indo para o Render; sem 405; sem erro de CORS; resultado correto na tela. |

Com isso você consegue verificar e ajustar todo o fluxo de verificação de receita de ponta a ponta.
