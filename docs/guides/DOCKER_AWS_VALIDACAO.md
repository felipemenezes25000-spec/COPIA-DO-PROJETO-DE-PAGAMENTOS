# Validação Docker para AWS (ECS)

Checklist para garantir que o backend .NET funciona corretamente na AWS (ECS Fargate ou App Runner).

---

## 1. Requisitos para AWS

| Requisito | Status | Detalhes |
|-----------|--------|----------|
| **Porta** | ✅ | O app deve escutar em `0.0.0.0:8080` (ou `PORT` injetado pelo ambiente). O Dockerfile usa porta 8080. |
| **Bind** | ✅ | O servidor deve fazer bind em `0.0.0.0` (não `127.0.0.1`) para receber tráfego do load balancer. |
| **Dockerfile** | ✅ | Contexto de build = raiz do repositório. `COPY backend-dotnet/ .` |

---

## 2. Dockerfile — Configuração Atual

O `backend-dotnet/Dockerfile` está configurado para:

- **PORT**: 8080 (ECS e ambientes AWS)
- **ASPNETCORE_URLS**: `http://+:8080`

---

## 3. Configuração na AWS

- **Imagem:** Build do Dockerfile e push para ECR (ou uso de CodeBuild/CodePipeline).
- **Task Definition:** variáveis de ambiente via SSM Parameter Store ou definidas na task (ver `infra/task-definition.json`).
- **Migrations:** aplicadas no startup pelo `MigrationRunner`.

---

## 4. Testar o build localmente

### 4.1 Build .NET

```powershell
cd backend-dotnet
dotnet build src/RenoveJa.Api/RenoveJa.Api.csproj -c Release
```

### 4.2 Rodar API na porta 8080 (simula AWS)

```powershell
cd backend-dotnet
$env:ASPNETCORE_URLS="http://+:8080"
$env:ASPNETCORE_ENVIRONMENT="Production"
dotnet run --project src/RenoveJa.Api/RenoveJa.Api.csproj -c Release --no-build
```

**Nota:** Em Production, `localhost` pode não estar em AllowedHosts. Para testar localmente com `http://localhost:8080/swagger`, use `ASPNETCORE_ENVIRONMENT=Development`.

### 4.3 Build Docker

```powershell
docker build -f backend-dotnet/Dockerfile -t renoveja-api .
docker run -p 8080:8080 renoveja-api
```

Acesse: `http://localhost:8080/swagger`

---

## 5. Variáveis de ambiente (AWS)

Configure no **ECS Task Definition** (ou SSM Parameter Store):

| Key | Obrigatório | Descrição |
|-----|-------------|-----------|
| `Api__BaseUrl` | Sim | URL pública da API (ex: `https://api.renovejasaude.com.br`) |
| `Verification__BaseUrl` | Sim | `{Api__BaseUrl}/api/verify` |
| `Api__DocumentTokenSecret` | Sim | 32+ caracteres para links de PDF |
| Demais | Sim | Conforme `.env.example` (RDS, S3, etc.) |

---

## 6. Problemas comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| 400 Invalid Hostname | Host não em AllowedHosts | Adicionar o domínio da API em `appsettings.Production.json` → `AllowedHosts` |
| Build falha no COPY | Contexto de build errado | Build a partir da raiz: `docker build -f backend-dotnet/Dockerfile .` |
| App crasha ao iniciar | Permissões em `logs/` | Dockerfile já configura `chown appuser` em `/app` |
