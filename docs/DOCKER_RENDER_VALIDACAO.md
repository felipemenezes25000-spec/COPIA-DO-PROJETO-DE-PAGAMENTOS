# Validação Docker para Render

Checklist para garantir que o backend .NET funciona corretamente no Render.

---

## 1. Requisitos do Render

| Requisito | Status | Detalhes |
|-----------|--------|----------|
| **Porta** | ✅ | O app deve escutar em `0.0.0.0:PORT`. O Render usa `PORT=10000` por padrão. |
| **Bind** | ✅ | O servidor deve fazer bind em `0.0.0.0` (não `127.0.0.1`) para receber tráfego externo. |
| **Dockerfile** | ✅ | Contexto de build = raiz do repositório. `COPY backend-dotnet/ .` |

---

## 2. Dockerfile — Configuração Atual

O `backend-dotnet/Dockerfile` está configurado para:

- **PORT**: Usa `PORT` da variável de ambiente (Render injeta `PORT=10000`)
- **ASPNETCORE_URLS**: Definido em runtime como `http://+:${PORT:-10000}`
- **Fallback**: Se `PORT` não existir, usa `10000`

```dockerfile
ENTRYPOINT ["sh", "-c", "export ASPNETCORE_URLS=http://+:${PORT:-10000} && exec dotnet RenoveJa.Api.dll"]
```

---

## 3. Configuração no Render Dashboard

| Campo | Valor recomendado |
|-------|-------------------|
| **Root Directory** | *(vazio)* ou `backend-dotnet` — depende de onde o Dockerfile está |
| **Dockerfile Path** | `backend-dotnet/Dockerfile` (se root = raiz do repo) |
| **Branch** | `fix/frontend-performance-responsive` ou `main` |
| **Instance Type** | Free / Starter / Standard |

Se o Root Directory for a raiz do repositório, o Render espera encontrar o Dockerfile. O Dockerfile atual usa `COPY backend-dotnet/ .`, então o **contexto de build deve ser a raiz** do repositório.

---

## 4. Testar o build localmente

### 4.1 Build .NET

```powershell
cd c:\Users\anabe\Downloads\renovejatac
dotnet build backend-dotnet/src/RenoveJa.Api/RenoveJa.Api.csproj -c Release
```

### 4.2 Rodar API na porta 10000 (simula Render)

```powershell
cd backend-dotnet
$env:PORT="10000"
$env:ASPNETCORE_URLS="http://+:10000"
$env:ASPNETCORE_ENVIRONMENT="Production"
dotnet run --project src/RenoveJa.Api/RenoveJa.Api.csproj -c Release --no-build
```

Saída esperada: `Now listening on: http://[::]:10000`

**Nota:** Em Production, `localhost` não está em AllowedHosts — requisições locais retornam 400. Para testar localmente com `http://localhost:10000/swagger`, use `ASPNETCORE_ENVIRONMENT=Development`.

### 4.3 Build Docker (requer Docker instalado)

```powershell
cd c:\Users\anabe\Downloads\renovejatac
docker build -f backend-dotnet/Dockerfile -t renoveja-api .
docker run -p 10000:10000 -e PORT=10000 renoveja-api
```

Depois acesse: `http://localhost:10000/swagger`

### 4.4 Resultado dos testes (última execução)

| Teste | Resultado |
|-------|-----------|
| `dotnet build` Release | OK |
| API inicia em `:10000` | OK — `Now listening on: http://[::]:10000` |
| Bind em `0.0.0.0` | OK |
| Docker build | Requer Docker instalado |

---

## 5. Variáveis de ambiente no Render

Além do `PORT` (automático), configure em **Environment**:

| Key | Obrigatório | Descrição |
|-----|-------------|-----------|
| `Api__BaseUrl` | Sim | URL pública (ex: `https://ola-jamal.onrender.com`) |
| `Verification__BaseUrl` | Sim | `{Api__BaseUrl}/api/verify` |
| `Api__DocumentTokenSecret` | Sim | 32+ caracteres para links de PDF |
| Supabase, etc. | Sim | Conforme `.env.example` |

---

## 6. Problemas comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Deploy falha "port not bound" | App escutando em porta errada | Dockerfile usa `PORT` — verificar se deploy aplicou a alteração |
| 400 Invalid Hostname | Host não em AllowedHosts | Adicionar `ola-jamal.onrender.com` em `appsettings.Production.json` |
| Serviço suspenso | Plano gratuito, 15 min inatividade | Acessar a URL e aguardar 1–2 min para acordar |
| Build falha no COPY | Contexto de build errado | Root Directory = raiz do repo; Dockerfile path = `backend-dotnet/Dockerfile` |

---

## 7. Referências

- [Render Web Services — Port Binding](https://render.com/docs/web-services#port-binding)
- [Render Default Environment Variables](https://render.com/docs/environment-variables)
