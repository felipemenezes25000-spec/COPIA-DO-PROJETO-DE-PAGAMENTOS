# CLAUDE.md — Guia de trabalho para este monorepo

## Objetivo
Entregar mudanças pequenas, seguras e verificáveis no projeto **ola-jamal**.

## Estrutura do projeto
- `frontend-web` → React + Vite + TypeScript
- `frontend-mobile` → Expo/React Native
- `backend-dotnet` → API .NET
- `scripts` → utilitários de automação

## Regras de execução (obrigatórias)
1. Sempre propor um plano curto antes de alterar arquivos.
2. Fazer mudanças mínimas e focadas no escopo pedido.
3. Não quebrar contratos de API sem avisar explicitamente.
4. Após mudanças, validar com lint/test/build no módulo afetado.
5. Responder no formato:
   - Resumo
   - Arquivos alterados
   - Como testar
   - Riscos/pendências

## Comandos rápidos por módulo

### frontend-web
```bash
cd frontend-web
npm run lint
npm run test:run
npm run build
```

### frontend-mobile
```bash
cd frontend-mobile
npm run lint
npm run typecheck
npm run test -- --watchAll=false
```

### backend-dotnet
```bash
cd backend-dotnet
dotnet build
# Se houver testes:
# dotnet test
```

## Padrões de qualidade
- Preferir funções pequenas e tipadas.
- Evitar `any` sem justificativa.
- Tratar estados de erro e loading em UI.
- Não introduzir dependências novas sem necessidade real.

## Checklist antes de concluir
- [ ] Escopo atendido
- [ ] Sem arquivos não relacionados alterados
- [ ] Lint/test/build do módulo principal executados
- [ ] Instruções de validação incluídas na resposta
