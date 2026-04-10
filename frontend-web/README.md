# RenoveJá+ — Frontend Web

Aplicação web do **RenoveJá+**: landing page, portal médico e **verificação pública de receitas** (QR Code + código de 6 dígitos). Consome apenas a **API .NET 8** (REST).

---

## Stack

| Item       | Tecnologia |
|-----------|------------|
| Framework | Vite + React 18 |
| Linguagem | TypeScript |
| Estilo    | Tailwind CSS |
| Backend   | API .NET 8 (`VITE_API_URL`) |
| Testes    | Vitest (unit) · Playwright (e2e) |
| Monitoramento | Sentry (`VITE_SENTRY_DSN`) |

---

## Estrutura

```
frontend-web/
├── src/
│   ├── components/   # Componentes reutilizáveis e por página
│   ├── pages/        # Páginas (landing, portal médico, verify)
│   ├── services/    # Clientes de API
│   ├── lib/          # Utilitários, logger, temas
│   ├── api/          # Chamadas de API (ex.: verify)
│   └── App.tsx       # Rotas e layout principal
├── e2e/              # Testes Playwright
└── public/
```

---

## Pré-requisitos

- Node.js 18+
- Backend .NET rodando (ou URL de ambiente) para API

---

## Setup

```bash
cd frontend-web
npm install
cp .env.example .env
```

Edite `.env` e defina pelo menos:

- `VITE_API_URL` — URL base do backend (ex.: `http://localhost:5000`)

Opcionais: `VITE_FORMSPREE_FORM_ID`, `VITE_SENTRY_DSN`.

---

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (`dist/`) |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint |
| `npm run test:run` | Testes unitários (Vitest) |
| `npx playwright test` | Testes e2e (Playwright) |

---

## Verificação de receitas (Verify v2)

- **URL:** `/verify/<id>?v=<token>`
- Usuário digita **código de 6 dígitos** (0–9).
- Backend: `POST /api/prescriptions/verify` (ou Edge Function conforme contrato em `.cursor/rules/020-verify-v2-contract.mdc`).

---

## Deploy

Build de produção é gerado com `npm run build`. Deploy típico: **AWS CloudFront + S3** ou Amplify. Configuração de infra: `infra/cdn.tf` e documentação em `docs/guides/`.

---

Documentação geral do monorepo: **[README.md](../README.md)** e **[docs/README.md](../docs/README.md)**.
