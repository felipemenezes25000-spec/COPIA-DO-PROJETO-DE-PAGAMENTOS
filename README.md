# RenoveJá+ — Plataforma de Telemedicina

Plataforma completa de telemedicina para **renovação de receitas**, **pedidos de exame** e **consultas online por vídeo**. Fluxo end-to-end: solicitação pelo paciente, triagem com IA, aprovação e assinatura digital ICP-Brasil pelo médico, pagamento PIX/cartão (Mercado Pago) e verificação pública de documentos via QR Code.

---

## Stack Tecnológica

| Camada | Tecnologia | Descrição |
|--------|-----------|-----------|
| **Backend** | .NET 8, C#, Clean Architecture | API REST com 14 controllers, autenticação Bearer, rate limiting, middleware de auditoria |
| **Mobile** | Expo 54, React Native 0.81, TypeScript | App iOS/Android/Web com Expo Router (file-based routing) |
| **Banco** | Supabase (PostgreSQL), Edge Functions | RLS, Storage, migrações versionadas, Edge Function Verify |
| **Web** | React (Vite), TypeScript | Página pública de verificação de receitas/exames |
| **Pagamentos** | Mercado Pago | PIX (QR Code + copia-e-cola), cartão de crédito, Checkout Pro |
| **Vídeo** | Daily.co | Videochamadas WebRTC para teleconsultas |
| **IA** | OpenAI GPT-4o, Deepgram | Leitura de receitas, triagem, anamnese, sugestão de conduta, transcrição |
| **Assinatura** | ICP-Brasil (PAdES) | Certificado digital A1/A3 para assinatura de PDFs |

---

## Funcionalidades

### Paciente
- Solicitar renovação de receita (simples, controlada, azul/antimicrobiana)
- Enviar fotos da receita antiga (IA analisa e extrai medicamentos)
- Solicitar pedido de exame (laboratorial, imagem, etc.)
- Agendar teleconsulta por vídeo (médico clínico ou psicólogo)
- Pagar via PIX ou cartão de crédito (Mercado Pago)
- Acompanhar status em tempo real (push notifications)
- Baixar PDF assinado digitalmente
- Consultar prontuário (histórico de atendimentos, receitas, exames)
- Cancelar pedido antes do pagamento
- Banco de horas para consultas (minutos não usados são creditados)

### Médico
- Dashboard com fila de atendimentos pendentes
- Triagem assistida por IA (resumo clínico, nível de risco, sugestão de conduta)
- Aprovar ou rejeitar solicitações com justificativa
- Editar medicamentos/exames antes de assinar
- Assinar digitalmente com certificado ICP-Brasil (PFX)
- Gerar PDF de receita ou pedido de exame
- Atender consultas por vídeo (Daily.co)
- Transcrição em tempo real da consulta (Deepgram)
- Anamnese gerada por IA ao final da consulta
- Gerenciar certificado digital (upload, revogação)
- Validar CRM via InfoSimples

### Verificação Pública (Farmácia/Terceiros)
- Escanear QR Code do documento
- Digitar código de 6 dígitos
- Verificar autenticidade do PDF assinado
- Baixar 2ª via do documento
- Sem necessidade de login

### Administrativo
- Trilha de auditoria LGPD (audit_logs + audit_events)
- Feature flags por feature
- Analytics (métricas de uso)
- Gerenciamento de médicos (admin)
- Preços configuráveis por produto (product_prices)

---

## Arquitetura

```
┌─────────────────────┐    HTTPS + Bearer    ┌─────────────────────┐
│  Frontend Mobile    │◄────────────────────►│   Backend .NET 8    │
│  (Expo / RN)        │                      │   (Clean Arch)      │
│                     │                      │                     │
│  ┌───────────────┐  │                      │  ┌───────────────┐  │
│  │ Paciente      │  │                      │  │ Controllers   │  │
│  │ Médico        │  │                      │  │ Services      │  │
│  └───────────────┘  │                      │  │ Repositories  │  │
└─────────────────────┘                      │  └───────────────┘  │
                                             └──────────┬──────────┘
          ┌─────────────────────────────────────────────┼──────────────┐
          ▼                        ▼                    ▼              ▼
  ┌──────────────┐      ┌──────────────┐     ┌──────────────┐  ┌──────────┐
  │  Supabase    │      │  Supabase    │     │ Mercado Pago │  │ Daily.co │
  │  PostgreSQL  │      │  Storage     │     │ (PIX/Cartão) │  │ (Vídeo)  │
  └──────────────┘      └──────────────┘     └──────────────┘  └──────────┘
```

### Backend — Clean Architecture (4 camadas)

```
RenoveJa.Api/            → Controllers, Middleware, Hubs (SignalR)
RenoveJa.Application/    → Services, DTOs, Validators, Interfaces
RenoveJa.Domain/         → Entities, Enums, Value Objects, Exceptions
RenoveJa.Infrastructure/ → Repositories (Supabase), AI, Payments, Storage, PDF
```

### Frontend Mobile — Expo Router

```
app/(auth)/      → Login, Register, Forgot Password, Google OAuth
app/(patient)/   → Home, Requests, Notifications, Profile, Record
app/(doctor)/    → Dashboard, Requests, Notifications, Profile
app/new-request/ → Prescription, Exam, Consultation
app/doctor-request/ → Detalhes e editor de solicitação (médico)
```

---

## Estrutura do Projeto

```
ola-jamal/
├── backend-dotnet/
│   ├── src/
│   │   ├── RenoveJa.Api/           # Host, Controllers, Middleware
│   │   ├── RenoveJa.Application/   # Serviços, DTOs, Validators
│   │   ├── RenoveJa.Domain/        # Entidades, Enums, Value Objects
│   │   └── RenoveJa.Infrastructure/# Repositórios, IA, Pagamentos
│   ├── tests/
│   │   └── RenoveJa.UnitTests/     # 350+ testes unitários
│   ├── docs/                        # Documentação técnica
│   ├── Dockerfile                   # Multi-stage build
│   └── docker-compose.yml
├── frontend-mobile/
│   ├── app/                         # Telas (Expo Router)
│   ├── components/                  # Componentes reutilizáveis
│   ├── contexts/                    # Auth, Notifications, Triage
│   ├── lib/                         # API client, triage, validation
│   ├── types/                       # Tipagens TypeScript
│   └── __tests__/                   # Testes do motor de triagem
├── frontend-web/                    # Página de verificação (Vite)
├── supabase/
│   ├── migrations/                  # 12 migrações SQL versionadas
│   └── functions/verify/            # Edge Function de verificação
├── docs/                            # Documentação geral
├── .github/workflows/               # CI (backend + frontend + Docker)
└── README.md
```

---

## Pré-requisitos

- **.NET 8 SDK**
- **Node.js 20+** e **npm**
- **Conta Supabase** (PostgreSQL + Storage + Edge Functions)
- **Mercado Pago** — Access Token (sandbox ou produção)
- **Expo Go** ou emulador Android/iOS
- **Certificado ICP-Brasil** (A1 PFX) para assinatura digital

---

## Variáveis de Ambiente

### Backend (`backend-dotnet/src/RenoveJa.Api/.env`)

| Variável | Descrição |
|----------|-----------|
| `Supabase__Url` | URL do projeto Supabase |
| `Supabase__ServiceKey` | Service Key (role: service_role) |
| `Supabase__DatabaseUrl` | Connection string PostgreSQL |
| `OpenAI__ApiKey` | Chave da API OpenAI (GPT-4o) |
| `MercadoPago__AccessToken` | Access Token do Mercado Pago |
| `MercadoPago__WebhookSecret` | Secret para validação HMAC do webhook |
| `Smtp__UserName` / `Smtp__Password` | Credenciais SMTP (recuperação de senha) |
| `Google__ClientId` | Client ID para Google OAuth |
| `DAILY_API_KEY` | API Key do Daily.co (vídeo) |
| `Api__BaseUrl` | URL pública da API |
| `Api__DocumentTokenSecret` | Secret para tokens de download |
| `CertificateEncryption__Key` | Chave AES para criptografia de PFX |

Veja `.env.example` para lista completa.

### Mobile (`frontend-mobile/.env`)

| Variável | Descrição |
|----------|-----------|
| `EXPO_PUBLIC_API_URL` | URL da API backend |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Client ID (Web) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Client ID (Android) |
| `EXPO_PUBLIC_TRIAGE_ENABLED` | Habilitar triagem com IA (true/false) |

---

## Como Rodar

### Backend

```bash
cd backend-dotnet/src/RenoveJa.Api
cp .env.example .env  # Preencher com suas credenciais
dotnet restore
dotnet run
```

A API inicia em `http://localhost:5000`. Swagger disponível em `/swagger` (apenas em Development).

### Mobile

```bash
cd frontend-mobile
cp .env.example .env  # Preencher EXPO_PUBLIC_API_URL
npm install
npx expo start
```

Escaneie o QR Code com Expo Go ou rode em emulador.

### Docker

```bash
cd backend-dotnet
docker-compose up --build
```

### Supabase (Migrações)

Aplique as migrações no SQL Editor do Supabase Dashboard na ordem:
1. `20260219000001_create_prescriptions_and_logs.sql`
2. `20260219000002_storage_prescriptions_bucket.sql`
3. `20260221000001_create_base_schema.sql`
4. `20260221000002_incremental_features.sql`
5. `20260221000003_add_correlation_id_to_logs.sql`
6. `20260223000001_consultation_time_bank.sql`
7. `20260223000002_consultation_started_at.sql`
8. `20260224235900_harden_rls_and_function_search_path.sql`
9. `20260228100000_make_prescriptions_bucket_public.sql`
10. `20260302000000_triage_assistant_conduct_observation.sql`
11. `20260303000000_prontuario_minimo.sql`
12. `20260303100000_hardening_seguranca_producao.sql` **(nova — segurança)**

---

## Fluxos Principais

### Receita
1. Paciente envia foto da receita antiga + tipo (simples/controlada/azul)
2. IA (GPT-4o) analisa a imagem: extrai medicamentos, avalia legibilidade e risco
3. Solicitação entra na fila do médico com resumo da IA
4. Médico revisa, edita medicamentos se necessário, aprova
5. Paciente paga via PIX (QR Code gerado pelo Mercado Pago)
6. Webhook confirma pagamento → status `paid`
7. Médico assina digitalmente com certificado ICP-Brasil
8. PDF gerado com QR Code de verificação + registrado no Verify v2
9. Paciente baixa o PDF assinado; farmácia verifica via QR Code

### Exame
1. Paciente envia exames desejados + sintomas + fotos opcionais
2. IA analisa e resume para o médico
3. Médico aprova, edita exames se necessário
4. Mesmo fluxo de pagamento → assinatura → PDF

### Consulta
1. Paciente escolhe tipo (médico clínico ou psicólogo) e duração
2. Paciente paga antecipadamente
3. Médico aceita → sala Daily.co criada
4. Videochamada com transcrição em tempo real (Deepgram)
5. Anamnese gerada por IA ao final
6. Timer de minutos contratados; minutos não usados vão para banco de horas

### Verificação Pública
1. Farmacêutico escaneia QR Code no PDF
2. Abre página web → digita código de 6 dígitos
3. Sistema valida → exibe dados do documento
4. Botão "Baixar 2ª via" gera signed URL temporária

---

## Endpoints da API (Principais)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/register` | Cadastro de paciente |
| `POST` | `/api/auth/register-doctor` | Cadastro de médico |
| `POST` | `/api/auth/login` | Login (retorna Bearer token) |
| `POST` | `/api/auth/google` | Login via Google OAuth |
| `GET` | `/api/auth/me` | Dados do usuário autenticado |
| `POST` | `/api/requests/prescription` | Nova solicitação de receita |
| `POST` | `/api/requests/exam` | Nova solicitação de exame |
| `POST` | `/api/requests/consultation` | Nova solicitação de consulta |
| `GET` | `/api/requests` | Listar solicitações (paginado) |
| `POST` | `/api/requests/{id}/approve` | Médico aprova solicitação |
| `POST` | `/api/requests/{id}/sign` | Médico assina digitalmente |
| `POST` | `/api/payments` | Criar pagamento PIX |
| `POST` | `/api/payments/webhook` | Webhook Mercado Pago |
| `GET` | `/api/doctors` | Listar médicos |
| `POST` | `/api/certificates/upload` | Upload de certificado PFX |
| `GET` | `/api/fhir-lite/patient-summary` | Prontuário do paciente |
| `GET` | `/api/health` | Health check |

Swagger completo disponível em `/swagger` (ambiente Development).

---

## Segurança

- **Autenticação:** Bearer token opaco armazenado em banco
- **Autorização:** Roles (patient, doctor, admin) com `[Authorize(Roles)]`
- **Rate Limiting:** Políticas por IP (auth: 10/min, register: 10/min, forgot-password: 5/min, global: 100/min)
- **CORS:** Origens restritas a domínios de produção
- **Headers:** HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **RLS:** Row Level Security habilitado em todas as tabelas do Supabase
- **LGPD:** Trilha de auditoria, consentimento, dados pessoais não logados
- **Assinatura:** ICP-Brasil PAdES com validação de certificado
- **Webhook:** Validação HMAC-SHA256 do Mercado Pago
- **Storage:** Bucket de imagens privado com signed URLs

---

## Testes

```bash
# Backend (350+ testes unitários)
cd backend-dotnet
dotnet test

# Frontend (motor de triagem)
cd frontend-mobile
npm test
```

---

## Deploy

| Componente | Plataforma | Configuração |
|-----------|-----------|-------------|
| Backend | Railway / Render | Dockerfile multi-stage, porta 8080 |
| Mobile | EAS Build | `eas build --profile production` |
| Web | Vercel | `frontend-web/`, domínio `renovejasaude.com.br/verify` |
| Supabase | Dashboard | Migrações via SQL Editor |
| Webhook | Mercado Pago | `https://SEU_DOMINIO/api/payments/webhook` |

---

## CI/CD

- **GitHub Actions:** CI automático em push/PR para `main`
  - Backend: restore → build → test (.NET 8)
  - Docker: build da imagem
  - Mobile: install → typecheck → test → export web
- **Build Android:** Workflow manual (`workflow_dispatch`) para gerar APK

---

## Documentação Adicional

| Documento | Conteúdo |
|-----------|----------|
| `docs/ANALISE_PONTA_A_PONTA.md` | Análise ponta a ponta: arquitetura, stack, rotas, fluxos e integrações |
| `docs/QUICK_START.md` | Guia rápido de setup |
| `docs/VERIFY_DEPLOY.md` | Deploy da Edge Function Verify |
| `docs/FLUXO_RECEITA_TELAS_E_STATUS.md` | Fluxo de receita e status |
| `docs/ENV_SEPARACAO.md` | Separação de variáveis de ambiente |
| `backend-dotnet/README.md` | Arquitetura do backend |
| `backend-dotnet/docs/MERCADOPAGO.md` | Integração Mercado Pago |
| `backend-dotnet/docs/FLUXO_RECEITA.md` | Fluxo técnico da receita |
| `backend-dotnet/docs/GOOGLE_LOGIN.md` | Configuração Google OAuth |
| `backend-dotnet/docs/ASSINATURA_PADES_ITI.md` | Assinatura ICP-Brasil |

---

**RenoveJá+** — .NET 8 · Expo · Supabase · Mercado Pago · Daily.co · OpenAI · ICP-Brasil
