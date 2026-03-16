# Ver logs do backend na AWS (CloudWatch)

O backend .NET roda no **ECS Fargate** e os logs vão para o **CloudWatch Logs**.

## Dados do projeto

| Recurso | Valor |
| --- | --- |
| Região | `sa-east-1` |
| Log group | `/ecs/renoveja-api` |
| Stream prefix | `api` (streams: `api/nome-do-task-id`) |
| Cluster ECS | `renoveja-prod` |
| Serviço ECS | `renoveja-api` |

---

## 1. Últimos logs (tail em tempo real)

**PowerShell (Windows) — acompanhar ao vivo:**

```powershell
aws logs tail /ecs/renoveja-api --follow --region sa-east-1
```

Os logs vão aparecendo no terminal. Para parar: **Ctrl+C**.

**Bash / WSL / Git Bash:**

```bash
aws logs tail /ecs/renoveja-api --follow --region sa-east-1
```

Para só as últimas linhas e sair (sem acompanhar):

```powershell
aws logs tail /ecs/renoveja-api --since 1h --region sa-east-1
```

---

## 2. Logs das últimas horas

```bash
# Última 1 hora
aws logs filter-log-events \
  --log-group-name /ecs/renoveja-api \
  --start-time $(date -d '1 hour ago' +%s000) \
  --region sa-east-1 \
  --output text

# Últimas 24 horas (PowerShell no Windows)
$start = [int64]((Get-Date).AddHours(-24).ToUniversalTime() `
  - (Get-Date "1970-01-01")).TotalMilliseconds
aws logs filter-log-events --log-group-name /ecs/renoveja-api `
  --start-time $start --region sa-east-1 --output text
```

No **Git Bash / WSL** (últimas 24h):

```bash
aws logs filter-log-events \
  --log-group-name /ecs/renoveja-api \
  --start-time $(($(date +%s) - 86400))000 \
  --region sa-east-1 \
  --output text
```

---

## 3. Buscar por texto (ex.: exceção, path, request)

```bash
aws logs filter-log-events \
  --log-group-name /ecs/renoveja-api \
  --filter-pattern "EXCEPTION" \
  --start-time $(($(date +%s) - 3600))000 \
  --region sa-east-1

# Exemplo: erros na rota de requests
aws logs filter-log-events \
  --log-group-name /ecs/renoveja-api \
  --filter-pattern "api/requests" \
  --start-time $(($(date +%s) - 3600))000 \
  --region sa-east-1
```

No **PowerShell** (última 1 hora e filtrar por "EXCEPTION"):

```powershell
$oneHourAgo = [int64]((Get-Date).AddHours(-1).ToUniversalTime() `
  - (Get-Date "1970-01-01")).TotalMilliseconds
aws logs filter-log-events --log-group-name /ecs/renoveja-api `
  --filter-pattern "EXCEPTION" --start-time $oneHourAgo `
  --region sa-east-1
```

---

## 4. Listar streams (tasks) atuais

```bash
aws logs describe-log-streams \
  --log-group-name /ecs/renoveja-api \
  --order-by LastEventTime \
  --descending \
  --max-items 10 \
  --region sa-east-1
```

---

## 5. Pré-requisitos

- **AWS CLI** instalado e configurado (`aws configure` com acesso à conta que tem
  o ECS/CloudWatch).
- Permissões: `logs:FilterLogEvents`, `logs:Tail`, `logs:DescribeLogStreams`, `logs:DescribeLogGroups`.

---

## 6. Ver no console AWS

1. Acesse **CloudWatch** → **Log groups**.
2. Abra `/ecs/renoveja-api`.
3. Abra um **Log stream** (prefixo `api/`) e veja os eventos.

Para erros da API (ex.: "Não foi possível carregar" em Pedidos), procure por
linhas com `[EXCEPTION]` ou `Exception` — o middleware do backend registra a
exceção antes de devolver 500.
