# Diagnóstico: API no Swagger vs Expo

## 1. Qual API o Expo está acessando?

### Configuração atual

| Origem | Valor |
|--------|-------|
| `.env` | `EXPO_PUBLIC_API_URL=http://192.168.15.69:5000` |
| `api-client.ts` (fallback) | Web: `localhost:5000` / Android emulador: `10.0.2.2:5000` / Outros: `localhost:5000` |

O Expo usa `process.env.EXPO_PUBLIC_API_URL` quando definido. No seu caso:

- **URL efetiva**: `http://192.168.15.69:5000`
- **Backend**: mesma API que responde em `0.0.0.0:5000` (todas as interfaces)

Ou seja: o Expo no celular usa o IP da máquina na rede local e atinge o mesmo backend que o Swagger.

---

## 2. Qual API o Swagger está acessando?

O Swagger é servido pelo próprio backend em:

- `http://localhost:5000/swagger` ou
- `http://127.0.0.1:5000/swagger` ou
- `http://192.168.15.69:5000/swagger`

As requisições "Try it out" vão para o **mesmo host** da página do Swagger. Exemplo:

- Swagger em `http://localhost:5000/swagger` → `POST /api/auth/login` → `http://localhost:5000/api/auth/login`

Ambos (Expo e Swagger) apontam para o **mesmo backend** rodando em `0.0.0.0:5000`.

---

## 3. Endpoints sem autorização (AllowAnonymous / sem [Authorize])

Endpoints que **não exigem** token:

| Método | Endpoint | Controller |
|--------|----------|------------|
| POST | `/api/auth/login` | AuthController |
| POST | `/api/auth/register` | AuthController |
| POST | `/api/auth/register-doctor` | AuthController |
| POST | `/api/auth/google` | AuthController |
| POST | `/api/auth/forgot-password` | AuthController |
| POST | `/api/auth/reset-password` | AuthController |
| GET | `/api/integrations/mercadopago-public-key` | IntegrationsController |
| GET | `/api/integrations/status` | IntegrationsController |
| POST | `/api/payments/webhook` | PaymentsController (webhook) |

Mesmo sem token, **toda** requisição passa pelo middleware de autenticação, que precisa instanciar `BearerAuthenticationHandler` → `IAuthService` → repositórios → `
---

## 4. O que o log do terminal mostra

Exemplo típico de log:

```
[API-IN] POST /api/auth/login | UserId=- | IP=127.0.0.1
[API-OUT] POST /api/auth/login | Status=200 | 0ms
[ERR] ...
HTTP POST /api/auth/login responded 400
```

Interpretação:

1. A requisição chega (IP 127.0.0.1 = Swagger / navegador na mesma máquina).
2. O controller responde 200 em um fluxo.
3. Em outro fluxo, ocorre exceção em `4. O `ExceptionHandlingMiddleware` converte isso em resposta **400 Bad Request** (`InvalidOperationException`).

O erro vem do construtor de `
---

## 5. Causa raiz

| Problema | Causa |
|----------|-------|
| Swagger retorna 400 em endpoints sem autorização | `| Dados não são salvos | A exceção ocorre antes do controller ou durante o pipeline, impedindo o fluxo normal |

Formato aceito pela `
- Válido: `sb_secret_...` ou JWT começando com `eyJ`
- Inválido: vazio, placeholder, ou chave anon (pública)

Se `appsettings.Development.json` não existir ou não estiver configurado, o backend usa `appsettings.json` com placeholders, o que causa o erro.

---

## 6. Por que o Expo funciona e o Swagger não?

Possíveis motivos:

1. **Variáveis de ambiente**  
   Se `   - O Swagger estiver apontando para outra URL/porta.

2. **Ordem e escopo das requisições**  
   O primeiro request que passa pelo middleware de auth dispara a criação de `
3. **URL diferente para o Swagger**  
   Se o Swagger estiver em outro host/porta, pode estar falando com outra instância do backend, com configuração diferente.

---

## 7. Verificações recomendadas

### 7.1 Conferir URL usada pelo Swagger

1. Abra o Swagger (ex.: `http://localhost:5000/swagger`).
2. Abra o DevTools (F12) → aba **Network**.
3. Clique em **Execute** em `POST /api/auth/login`.
4. Clique na requisição e verifique:
   - URL exata usada (Request URL)
   - Status HTTP
   - Corpo da resposta (Response)

### 7.2 Conferir se está enviando Authorization

No Swagger, se você usou **Authorize** e preencheu um token, o Swagger envia `Authorization: Bearer <token>` em **todas** as requisições. Para login/registro:

- Clique em **Authorize**.
- Use **Logout** ou limpe o token.
- Execute o login novamente.

### 7.3 Verificar configuração do backend\n
1. Existe `appsettings.Development.json` na pasta `RenoveJa.Api`?
2. `3. Ao rodar o backend, há variáveis de ambiente definidas (ex.: `
### 7.4 Testar o login via curl

Para isolar o Swagger:

```powershell
curl -X POST "http://localhost:5000/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"seu@email.com","password":"sua_senha"}'
```

- Se retornar 200: o problema está no uso do Swagger (headers, URL, etc.).
- Se retornar 400 com mensagem de PostgreSQL/RDS: o problema é a configuração do backend.

---

## 8. Resumo

| Item | Valor |
|------|-------|
| URL usada pelo Expo | `http://192.168.15.69:5000` (via `.env`) |
| URL usada pelo Swagger | Mesmo host da página (ex.: `http://localhost:5000`) |
| Causa provável do 400 no Swagger | `| Impacto em endpoints sem autorização | Mesmo sem token, o pipeline de autenticação instancia serviços que usam `
**Próximo passo**: garantir que `appsettings.Development.json` existe e contém `PostgreSQL/RDS:Url` e `