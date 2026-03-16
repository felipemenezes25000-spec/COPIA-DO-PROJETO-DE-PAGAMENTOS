# Tutorial completo: o que fazer no navegador

Passo a passo **só no navegador** para deixar o validador de receita e o download/visualização de PDF funcionando em produção. Sem terminal, sem código.

---

## Parte 1 — Frontend na AWS (site do validador)

O frontend-web (validador) está hospedado na **AWS** (CloudFront + S3 ou Amplify). As variáveis de ambiente são definidas no **pipeline de build** (ex.: GitHub Actions, CodeBuild) ou no console do serviço usado (ex.: Amplify → Environment variables).

### 1.1 Configurar a URL da API

1. No seu fluxo de deploy do frontend (AWS Amplify, CodeBuild, ou script que faz build e upload para S3):
   - Garanta que a variável **VITE_API_URL** esteja definida **no momento do build** (variáveis Vite são embutidas no bundle).
   - **Value:** a URL da sua **API na AWS**, **sem barra no final**  
     Exemplo: `https://api.renovejasaude.com.br`  
     (troque pela URL real da API)
2. Salve a configuração e dispare um **novo build e deploy** para que o site em produção use a nova variável.

### 1.2 Conferir o domínio do site

Anote o domínio em produção (ex.: `renovejasaude.com.br` ou o domínio configurado no CloudFront/Amplify). Você vai usar para testar e, se precisar, para configurar CORS na API (AWS).

---

## Parte 2 — API na AWS

A API (backend .NET) roda na **AWS** (ECS, App Runner ou equivalente). Variáveis de ambiente ficam na Task Definition, Parameter Store ou console do serviço.

### 2.1 URL da API

1. Anote a URL pública da API (ex.: `https://api.renovejasaude.com.br`)
2. Use essa URL (sem barra no final) em **VITE_API_URL** no build do frontend

### 2.3 Variáveis de ambiente (obrigatórias e CORS)

1. No menu do serviço (lado esquerdo), clique em **Environment**
2. Confira ou adicione estas variáveis:

| O que fazer | Key | Value |
|-------------|-----|--------|
| **Obrigatório** | `Api__BaseUrl` | URL pública da API (ex.: `https://api.renovejasaude.com.br`) |
| **Obrigatório para PDF no app/link** | `Api__DocumentTokenSecret` | Uma string secreta com **pelo menos 32 caracteres** (ex.: `minha-chave-secreta-prod-2025-com-32-chars` ou gere uma aleatória). Sem ela, ao tocar em “Visualizar PDF Assinado” ou abrir o link do documento no navegador aparece “Token de autenticação inválido ou ausente.” |
| **Se o site for em outro domínio** | `Cors__AllowedOrigins__0` | `https://renovejasaude.com.br` |
| **Se o site estiver em outro domínio** | `Cors__AllowedOrigins__1` | URL exata do site (ex.: `https://seu-dominio.com`) |

3. Para **adicionar** variável:
   - Clique em **Add Environment Variable** (ou **Edit** e depois **+ Add** → **New variable**)
   - Preencha **Key** e **Value**
   - Não apague outras variáveis ao preencher (preste atenção em qual linha está editando)
4. Clique em **Save Changes** (ou **Save, rebuild, and deploy**)
5. Após salvar, faça **novo deploy** da API na AWS

### 2.4 Testar a API no navegador (só para conferir)

1. Abra uma **nova aba**
2. Na barra de endereço, digite a URL do serviço + `/api/prescriptions/verify`  
   Exemplo: `https://api.renovejasaude.com.br/api/prescriptions/verify`  
   e pressione Enter
3. Deve aparecer **405** ou “method not allowed” — **é esperado**, pois a API espera **POST**. O importante é a página carregar da **API** (URL da barra é da API), não “site não encontrado”
4. Se der “site não encontrado” ou timeout, a API não está acessível (serviço parado, URL errada ou rede)

---

## Parte 3 — Testar o validador no navegador

### 3.1 Abrir a página de verificação

1. Abra uma **nova aba**
2. Digite o endereço do site em produção + `/verify/` + um ID de receita  
   Exemplos:
   - `https://renovejasaude.com.br/verify/550e8400-e29b-42d4-a716-446655440000`
   - ou o domínio do seu site em produção (ex.: `https://seu-dominio.com/verify/...`)
3. Troque o UUID por um ID real que você tenha (pode ser o de uma receita de teste)
4. Pressione Enter — deve abrir a página **Verificação de Receita** com o campo de código

### 3.2 Abrir as ferramentas do desenvolvedor (Rede)

1. Pressione **F12** (ou botão direito na página → **Inspecionar**)
2. Clique na aba **Rede** (ou **Network**)
3. Deixe a aba Rede aberta (pode ficar embaixo ou ao lado)
4. Se já houver muitas linhas, clique no ícone de **limpar** (círculo com risco) para zerar a lista

### 3.3 Fazer uma verificação e observar a requisição

1. No campo **Código de verificação**, digite **6 dígitos** (pode ser inválido para teste, ex.: `000000`)
2. Clique em **Validar**
3. Na aba **Rede (Network)**:
   - Deve aparecer uma nova linha com nome tipo **verify** ou **prescriptions/verify**
   - Clique nessa linha para ver os detalhes
4. Confira:
   - **Headers** → **Request URL:**  
     - **Certo:** URL da **API** (ex.: `https://api.renovejasaude.com.br/api/prescriptions/verify`)  
     - **Errado:** URL do mesmo domínio do site → costuma dar **405**
   - **Request Method:** deve ser **POST**
   - **Status:**  
     - **200** = servidor respondeu (válido ou inválido no corpo)  
     - **405** = em geral **VITE_API_URL** ainda apontando para o próprio site (frontend) em vez da API  
     - **0** ou bloqueado = em geral CORS (origem não permitida na API)

### 3.4 Ver a resposta da API (corpo)

1. Com a linha da requisição **verify** selecionada, clique na subaba **Resposta** (ou **Response**)
2. Você deve ver um JSON, por exemplo:
   - Código inválido: `{ "isValid": false, "status": "invalid", "reason": "INVALID_CODE" }`
   - Código válido: `{ "isValid": true, "status": "valid", "issuedAt": "...", "doctorCrm": "...", ... }`
3. Se o status for 200 e o JSON estiver correto, a integração está ok

### 3.5 Testar código válido e botão Baixar PDF (opcional)

1. Se você tiver o **ID** e o **código de 6 dígitos** de uma receita já assinada:
2. Abra de novo a página: `https://seu-site.com/verify/{id-da-receita}`
3. Digite o código correto e clique em **Validar**
4. Deve aparecer **Receita válida**, com Emitida em, Assinada em, Médico, **CRM completo** e o botão **Baixar PDF (2ª via)**
5. Clique em **Baixar PDF (2ª via)** — deve abrir ou baixar o PDF (a URL usa o endpoint `/api/verify/{id}/document?code=...`, que não exige token de login)

---

## Parte 4 — Baixar / visualizar PDF pelo app ou por link (evitar erro de token)

Quando o usuário toca em **“Visualizar PDF Assinado”** no app (ou abre um link enviado por e-mail) a URL é algo como:

`https://api.renovejasaude.com.br/api/requests/{id}/document`

Esse endpoint aceita **?token=...** (para abrir no navegador sem login). O token só é gerado se a variável **Api__DocumentTokenSecret** estiver configurada na API (AWS).

### 4.1 Configurar na API (AWS)

1. Na **Task Definition** ou **Parameter Store** da API (AWS), vá nas variáveis de ambiente
2. Confira se existe **Api__DocumentTokenSecret** com um valor de **pelo menos 32 caracteres**
3. Se **não existir**:
   - Clique em **Add Environment Variable** (ou **Edit** → **+ Add** → **New variable**)
   - **Key:** `Api__DocumentTokenSecret`
   - **Value:** uma string secreta longa (ex.: `chave-super-secreta-prod-2025-min-32-caracteres` ou use um gerador de senha)
   - Salve e faça **novo deploy** da API
4. Depois do deploy, os links de documento passam a incluir `?token=...` e abrem no navegador sem “Token de autenticação inválido ou ausente.”

### 4.2 Como conferir

1. No **app** (mobile ou web), entre em uma receita já assinada e toque em **Visualizar PDF Assinado** (ou equivalente)
2. O link que abrir deve ter na URL algo como: `.../document?token=...`
3. A página deve mostrar ou baixar o PDF; não deve aparecer a mensagem de token inválido

---

## Resumo rápido (checklist no navegador)

| Onde | O que fazer |
|------|-------------|
| **Frontend (AWS)** | Definir `VITE_API_URL` = URL da API no build (Amplify/CodeBuild/pipeline) → novo build e deploy |
| **API (AWS)** | `Api__BaseUrl` = URL da API; **Api__DocumentTokenSecret** = chave de 32+ caracteres (para PDF no app/link); se precisar, `Cors__AllowedOrigins__0/1` com o domínio do site → novo deploy |
| **Teste validador** | Abrir `/verify/{id}` → F12 → Rede → Validar → Ver se a requisição vai para a API (POST, status 200) |
| **Teste PDF app/link** | No app, tocar em Visualizar PDF → link deve ter `?token=...` e o PDF deve abrir sem erro de token |

Se a requisição do validador for para a **API** e retornar **200**, e o link do documento abrir com **?token=** e o PDF carregar, tudo que depende do navegador está configurado.
