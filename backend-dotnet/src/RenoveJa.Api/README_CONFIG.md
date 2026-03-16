# Configuração rápida — Backend .NET 8

## Variáveis obrigatórias para rodar localmente

### 1. ConnectionStrings__DefaultConnection
Connection string PostgreSQL (AWS RDS em produção, local em dev):
```
Host=localhost;Database=renoveja;Username=postgres;Password=SUA_SENHA
```
Configure em `appsettings.Development.json` (nunca commitar).

### 2. OpenAI__ApiKey
Chave da API OpenAI (formato `sk-proj-...`). Sem ela, leitura de receitas e geração de anamnese não funcionam.

### 3. Api__BaseUrl e Api__DocumentTokenSecret
URL pública da API e secret para tokens de documento/imagem. Necessários para o médico visualizar imagens e documentos assinados.

Sem as chaves reais, a API pode iniciar, mas login, IA e storage falharão.

Ver `docs/VARIAVEIS_AMBIENTE.md` para lista completa.
