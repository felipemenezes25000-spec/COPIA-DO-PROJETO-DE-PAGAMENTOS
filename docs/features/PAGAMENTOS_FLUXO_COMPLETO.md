# 💰 Pagamentos — Fluxo Completo (RenoveJá)

> **Documento mestre sobre COMO FUNCIONAM OS PAGAMENTOS na plataforma RenoveJá.**
> Cobre: provedor, entidades, endpoints, fluxo ponta-a-ponta, preços, status, webhooks,
> cartões salvos, consultas por minuto, reembolsos, notificações e troubleshooting.
>
> Última atualização: 2026-04-08
> Escopo: `backend-dotnet/`, `frontend-mobile/`, `frontend-web/`

---

## 📑 Índice

1. [Visão Geral — O que É (e o que NÃO É)](#1-visão-geral)
2. [Provedor de Pagamentos](#2-provedor-de-pagamentos)
3. [Modelo de Negócio — Por Pedido, Não por Assinatura](#3-modelo-de-negócio)
4. [De Onde Vêm os Valores (Preços)](#4-de-onde-vêm-os-valores)
5. [Entidades de Domínio](#5-entidades-de-domínio)
6. [Máquina de Estados — Pedido × Pagamento](#6-máquina-de-estados)
7. [Fluxo Completo Ponta-a-Ponta](#7-fluxo-completo-ponta-a-ponta)
8. [Endpoints da API de Pagamentos](#8-endpoints-da-api)
9. [PIX — Fluxo Detalhado](#9-pix-fluxo-detalhado)
10. [Cartão — Fluxo Detalhado](#10-cartão-fluxo-detalhado)
11. [Cartões Salvos (Tokenização)](#11-cartões-salvos)
12. [Checkout Pro (Fallback)](#12-checkout-pro)
13. [Webhooks do Mercado Pago](#13-webhooks)
14. [Sincronização Manual (Fallback de Webhook)](#14-sincronização-manual)
15. [Consultas por Minuto & Banco de Horas](#15-consultas-por-minuto)
16. [Reembolso e Cancelamento](#16-reembolso-e-cancelamento)
17. [Notificações Vinculadas ao Pagamento](#17-notificações)
18. [Repasse para o Médico (Payout)](#18-repasse-para-o-médico)
19. [Configuração & Variáveis de Ambiente](#19-configuração)
20. [Tabelas do Banco de Dados](#20-tabelas-do-banco)
21. [Auditoria — PaymentAttempt & WebhookEvent](#21-auditoria)
22. [Front-end — Telas e Componentes](#22-frontend)
23. [Troubleshooting](#23-troubleshooting)
24. [Glossário](#24-glossário)
25. [Mapa de Arquivos](#25-mapa-de-arquivos)

---

## 1. Visão Geral

A RenoveJá **NÃO é um SaaS por assinatura**. É um **marketplace de saúde por pedido**
(prescrição, exame, consulta). Cada pedido médico gera **um pagamento único** feito
pelo paciente, processado pelo **Mercado Pago**.

```
Paciente cria pedido  →  Médico aprova e define preço (vindo do banco)
     ↓
Sistema coloca o pedido em "ApprovedPendingPayment"
     ↓
Paciente escolhe método (PIX / Cartão / Checkout Pro)
     ↓
Mercado Pago recebe → envia WEBHOOK → sistema confirma → pedido vira "Paid"
     ↓
Médico assina (documento) OU inicia videoconsulta (tempo real)
     ↓
Paciente recebe o resultado (Signed/Delivered/ConsultationFinished)
```

### O que EXISTE
- ✅ Pagamento PIX (QR Code + Copia-e-Cola)
- ✅ Pagamento por Cartão de Crédito (com parcelamento)
- ✅ Pagamento por Cartão de Débito
- ✅ Checkout Pro do Mercado Pago (página hospedada)
- ✅ Cartões salvos por cliente (one-click payment)
- ✅ Consulta cobrada por **minutos contratados** (banco de horas)
- ✅ Webhooks validados via HMAC-SHA256
- ✅ Fallback manual (`sync-status`) caso o webhook falhe
- ✅ Auditoria completa (`PaymentAttempt` + `WebhookEvent`)

### O que NÃO EXISTE (ainda)
- ❌ Assinatura recorrente (nenhum plano mensal/anual)
- ❌ Split automático de repasse para médicos (Stripe Connect-like)
- ❌ Endpoint HTTP de reembolso (o método de domínio existe, mas não está exposto)
- ❌ Conciliação financeira automatizada
- ❌ Emissão de NF automática

---

## 2. Provedor de Pagamentos

### Mercado Pago (único provedor)

**Por quê?** A RenoveJá é focada no Brasil — Mercado Pago é o principal gateway local
com suporte nativo a PIX e parcelamento doméstico.

**SDK:** API REST direta via `HttpClient` (sem SDK oficial do MP). Implementação em:

- `backend-dotnet/src/RenoveJa.Infrastructure/Payments/MercadoPagoService.cs` (~580 linhas)
- Config tipada em `RenoveJa.Application/Configuration/MercadoPagoConfig.cs`
- Documentação existente: `backend-dotnet/docs/MERCADOPAGO.md`

**Endpoints externos usados:**

| Método | URL | Propósito |
|---|---|---|
| POST | `https://api.mercadopago.com/v1/payments` | Criar pagamento PIX ou cartão |
| GET  | `https://api.mercadopago.com/v1/payments/{id}` | Consultar status real |
| POST | `https://api.mercadopago.com/v1/customers` | Criar cliente (cartão salvo) |
| POST | `https://api.mercadopago.com/v1/customers/{id}/cards` | Salvar cartão |
| POST | `https://api.mercadopago.com/checkout/preferences` | Gerar link Checkout Pro |

**Autenticação:**
```
Authorization: Bearer {MercadoPago:AccessToken}
X-Idempotency-Key: {GUID por tentativa}
Content-Type: application/json
```

---

## 3. Modelo de Negócio

| Tipo de Pedido | Como é cobrado | Exemplo |
|---|---|---|
| **Prescrição Simples** | Valor fixo por pedido | R$ 29,90 |
| **Prescrição Controlada** | Valor fixo por pedido | R$ 49,90 |
| **Prescrição Azul (A/B)** | Valor fixo por pedido | R$ 129,90 |
| **Exame Laboratorial** | Valor fixo por pedido | R$ 19,90 |
| **Exame de Imagem** | Valor fixo por pedido | R$ 29,90 |
| **Consulta Psicólogo** | R$ 3,99 × minutos contratados | 15 min = R$ 59,85 |
| **Consulta Médico Clínico** | R$ 6,99 × minutos contratados | 30 min = R$ 209,70 |

**Observação sobre consultas:** Se o paciente não consumir todos os minutos
comprados, o excedente vai para um **banco de horas** do próprio paciente, que pode
ser usado em futuras consultas sem pagar novamente (preço = 0 → pedido vai direto
para `Paid`, sem passar por gateway).

---

## 4. De Onde Vêm os Valores

### 4.1 Fonte da verdade: tabela `product_prices` no PostgreSQL

**Nunca confie no preço enviado pelo cliente.** O back-end ignora qualquer valor
vindo do request e sempre consulta o banco.

```
product_prices
├── product_type  ("prescription" | "exam" | "consultation")
├── subtype       ("simples" | "controlado" | "azul" | "default")
├── price_brl     DECIMAL(10,2)
└── is_active     BOOLEAN
```

### 4.2 Onde o preço é aplicado

**Arquivo:** `RenoveJa.Application/Services/Requests/RequestApprovalService.cs`

Quando o médico clica em "Aprovar":

```csharp
var (productType, subtype) = GetProductTypeAndSubtype(request);
var price = await _productPriceRepository.GetPriceAsync(productType, subtype, ct);

if (price <= 0 && request.Type != RequestType.Consultation)
    throw new DomainException("Preço não configurado");

request.Approve(new Money(price));   // Status → ApprovedPendingPayment
```

### 4.3 Fallback no front-end

**Arquivo:** `frontend-mobile/lib/config/pricing.ts`

Se a API ficar offline no momento de exibir o resumo do pedido, o app usa:

```ts
FALLBACK_PRICES = {
  prescription: 29.9,
  exam: 19.9,
  consultation: 120,
};
```

⚠️ **Esses valores são apenas para exibição**. O valor REAL cobrado é sempre o que
vem do back-end no campo `request.price` após aprovação do médico.

---

## 5. Entidades de Domínio

### 5.1 `Payment` — o pagamento em si

**Arquivo:** `RenoveJa.Domain/Entities/Payment.cs`

```csharp
public class Payment : Entity
{
    public Guid   RequestId        { get; }   // FK → MedicalRequest
    public Guid   UserId           { get; }   // FK → User (paciente)
    public Money  Amount           { get; }   // Valor em BRL
    public PaymentStatus Status    { get; }   // Pending|Approved|Rejected|Refunded
    public string PaymentMethod    { get; }   // "pix"|"credit_card"|"debit_card"|"checkout_pro"
    public string? ExternalId      { get; }   // ID do MP (preenchido após criar)

    // PIX
    public string? PixQrCode       { get; }   // EMV/BR Code
    public string? PixQrCodeBase64 { get; }   // imagem PNG base64
    public string? PixCopyPaste    { get; }

    public DateTime? PaidAt        { get; }   // quando foi aprovado
    public DateTime  UpdatedAt     { get; }
}
```

**Métodos de factory:**
- `Payment.CreatePixPayment(requestId, userId, amount)`
- `Payment.CreateCardPayment(requestId, userId, amount, "credit_card"|"debit_card")`
- `Payment.CreateCheckoutProPayment(requestId, userId, amount)`

**Transições:**
- `SetPixData(...)` → popula dados do QR após chamar o MP
- `SetExternalId(...)` → grava o id do MP (cartões)
- `Approve()` → Pending → Approved, seta `PaidAt = now`
- `Reject()` → Pending → Rejected
- `Refund()` → Approved → Refunded (somente)

### 5.2 `PaymentAttempt` — auditoria de cada chamada ao MP

Toda request HTTP para o MP gera uma linha na `payment_attempts`, guardando:
- `CorrelationId` (trace único)
- URL chamada, payload enviado, payload recebido
- `ResponseStatusCode`, `ResponseStatusDetail`
- Sucesso ou falha + mensagem de erro

**Por quê?** Para depurar quando o MP rejeita um pagamento ou devolve mensagem
obscura. Você consegue reconstruir exatamente o que foi enviado.

### 5.3 `SavedCard` — cartão tokenizado

```csharp
public class SavedCard : Entity
{
    public Guid   UserId       { get; }
    public string MpCustomerId { get; }  // /v1/customers/{id}
    public string MpCardId     { get; }  // card dentro do customer
    public string LastFour     { get; }  // "1234"
    public string Brand        { get; }  // "visa", "master", ...
}
```

A RenoveJá **nunca armazena o número do cartão**. Armazena só o `card_id` do MP
e os 4 últimos dígitos para exibição.

### 5.4 `WebhookEvent` — auditoria/idempotência de webhooks

```csharp
public class WebhookEvent : Entity
{
    public string? MercadoPagoPaymentId { get; }
    public string? MercadoPagoRequestId { get; }  // X-Request-Id (idempotência)
    public string? WebhookType          { get; }  // "payment"
    public string? WebhookAction        { get; }  // "payment.created" | "payment.updated"
    public string? RawPayload           { get; }  // corpo cru
    public bool    IsDuplicate          { get; }
    public bool    IsProcessed          { get; }
    public string? ProcessingError      { get; }
    public DateTime? ProcessedAt        { get; }
}
```

---

## 6. Máquina de Estados

### 6.1 `PaymentStatus`

```
                    POST /payments
                         │
                         ▼
                     ┌────────┐
                     │Pending │
                     └───┬────┘
          webhook approved│     │ webhook rejected/cancelled
          ou POST /confirm│     │ ou cartão recusado
                         ▼     ▼
                    ┌─────────┐ ┌──────────┐
                    │Approved │ │ Rejected │  (terminal)
                    └───┬─────┘ └──────────┘
         Payment.Refund()│
                         ▼
                    ┌─────────┐
                    │Refunded │  (terminal)
                    └─────────┘
```

### 6.2 `RequestStatus` e ligação com pagamento

**Prescrição / Exame:**
```
Submitted → InReview → ApprovedPendingPayment ──[pagamento aprovado]──▶ Paid → Signed → Delivered
                 │                                                        ▲
                 └─▶ Rejected / Cancelled                                  │
                                                                 (Payment.Approved)
```

**Consulta:**
```
Submitted → SearchingDoctor → ApprovedPendingPayment ──▶ Paid → InConsultation → ConsultationFinished
                                       │
                     se price == 0 (banco de horas)
                                       ▼
                                     Paid (sem passar pelo MP)
```

**Gatilho central do pagamento:** o pedido só aceita `POST /api/payments` quando
`request.Status == ApprovedPendingPayment`. Qualquer outro estado devolve erro.

---

## 7. Fluxo Completo Ponta-a-Ponta

### Passo 1 — Paciente cria o pedido

```http
POST /api/requests/prescription
Authorization: Bearer {token-paciente}

{ "prescriptionType": "simples", "images": [...], "notes": "..." }
```

Resultado: `MedicalRequest` criado com `Status=Submitted`, `Price=null`.

### Passo 2 — Médico aprova e o preço é fixado

```http
POST /api/requests/{requestId}/approve
Authorization: Bearer {token-medico}

{ "notes": "Uso contínuo ok" }
```

Internamente:
1. `RequestApprovalService` consulta `product_prices` (p.ex. `prescription/simples` → R$ 29,90)
2. `request.Approve(new Money(29.90))` → Status vira `ApprovedPendingPayment`
3. Dispara push: `PushNotificationRules.ApprovedPendingPayment(patientId, requestId, type)`
4. Paciente recebe notificação e abre o app no deep-link `/payment/request/{id}`

### Passo 3 — Paciente inicia o pagamento (PIX)

```http
POST /api/payments
Authorization: Bearer {token-paciente}

{ "requestId": "a1b2...", "paymentMethod": "pix" }
```

Internamente (`PaymentService.CreatePaymentAsync`):
1. **Valida** `request.Status == ApprovedPendingPayment`
2. **Lê o preço do PEDIDO**, nunca do request body
3. **Lock por requestId** (`SemaphoreSlim`) — evita race de PIX duplicado
4. Se já existe PIX pendente → verifica no MP se não foi aprovado "às escondidas"
5. Cria `Payment(Pending)` no banco
6. Cria `PaymentAttempt` (registro inicial)
7. Chama `MercadoPagoService.CreatePixPaymentAsync(...)` → devolve `{id, qr_code, qr_code_base64, ticket_url}`
8. `payment.SetPixData(...)` e salva
9. Grava sucesso no `PaymentAttempt`
10. Retorna `PaymentResponseDto` com QR e copia-e-cola
11. Cria notificação in-app "Pagamento criado"

### Passo 4 — Paciente paga

Paciente abre app do banco, escaneia QR ou cola o código → transferência PIX
para a conta do Mercado Pago da RenoveJá.

### Passo 5 — MP envia webhook

```http
POST /api/payments/webhook
X-Signature: ts=1712345678,v1=abc123...
X-Request-Id: 9f1a2b...

{ "action": "payment.updated", "data": { "id": "1234567890" } }
```

`PaymentWebhookHandler`:
1. Extrai o payment id de `data.id` (ou `resource`, ou query string)
2. Valida HMAC-SHA256 com `MercadoPago:WebhookSecret` (tenta múltiplos formatos de manifest)
3. Checa duplicidade pelo `X-Request-Id` → se já processado, retorna 200 (idempotente)
4. Persiste `WebhookEvent` (raw + headers + IP)
5. Delega para `PaymentService.ProcessWebhookAsync(...)`

`PaymentService.ProcessWebhookAsync`:
1. Busca `Payment` pelo `external_id`
2. Se não achou, usa `MercadoPagoService.GetPaymentDetailsAsync(id)` para ler o `external_reference` (= `requestId`) e localizar
3. **Nunca confia no status do webhook.** Chama `GET /v1/payments/{id}` no MP para ler o status real
4. Se `approved`:
   - `payment.Approve()`
   - `request.MarkAsPaid()` → Status vira `Paid`
   - Publica evento `RequestUpdated` no SignalR (`RequestsHub`)
   - Push para o médico: "Pagamento recebido — consulta pronta" / "Documento pronto pra assinar"
   - Notificação in-app para o paciente
5. Se `rejected` / `cancelled`: `payment.Reject()` (o request **não** é cancelado — paciente pode tentar outro método)
6. Marca `WebhookEvent.IsProcessed = true`

### Passo 6 — Entrega

- **Prescrição / Exame:** médico assina (`POST /api/requests/{id}/sign`) → `Signed`. Paciente baixa → `Delivered`.
- **Consulta:** ambos entram na sala de vídeo → `ConsultationStartedAt = now` → ao final, `ConsultationFinished` e banco de horas atualizado se sobrou tempo.

---

## 8. Endpoints da API

**Arquivo:** `RenoveJa.Api/Controllers/PaymentsController.cs`

| # | Método | Rota | Auth | O que faz |
|---|---|---|---|---|
| 1 | POST | `/api/payments` | Bearer | Cria pagamento (PIX ou cartão). Corpo decide o método. |
| 2 | GET  | `/api/payments/{id}` | Bearer | Busca detalhes do pagamento por id interno |
| 3 | GET  | `/api/payments/by-request/{requestId}` | Bearer | Busca o pagamento pendente de um pedido |
| 4 | GET  | `/api/payments/{id}/pix-code` | Bearer | Devolve o copia-e-cola como texto puro |
| 5 | POST | `/api/payments/{id}/confirm` | Bearer | **Só em dev** — força Approve local |
| 6 | POST | `/api/payments/confirm-by-request/{requestId}` | Bearer | **Só em dev** — força Approve por requestId |
| 7 | GET  | `/api/payments/checkout-pro/{requestId}` | Bearer | Gera URL `init_point` do Checkout Pro |
| 8 | POST | `/api/payments/sync-status/{requestId}` | Bearer | Fallback: consulta status no MP sem webhook |
| 9 | GET  | `/api/payments/saved-cards` | Bearer | Lista cartões salvos do paciente |
| 10 | POST | `/api/payments/add-card` | Bearer | Salva cartão novo (via token do Brick) |
| 11 | POST | `/api/payments/saved-card` | Bearer | Paga com cartão salvo (pede CVV novo) |
| 12 | POST | `/api/payments/webhook` | **Anônimo** | Endpoint chamado pelo Mercado Pago |
| 13 | GET  | `/api/payments/webhook` | **Anônimo** | Health check (MP pinga para validar URL) |

---

## 9. PIX — Fluxo Detalhado

### 9.1 Request

```json
POST /api/payments
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "paymentMethod": "pix"
}
```

### 9.2 O que o back-end envia ao MP

```json
POST https://api.mercadopago.com/v1/payments
Authorization: Bearer APP_USR-...
X-Idempotency-Key: {guid-por-tentativa}

{
  "transaction_amount": 29.90,
  "description": "Prescrição simples - RenoveJá",
  "payment_method_id": "pix",
  "payer": { "email": "paciente@exemplo.com" },
  "external_reference": "550e8400-e29b-41d4-a716-446655440000",
  "notification_url": "https://api.renovejasaude.com.br/api/payments/webhook"
}
```

### 9.3 Resposta salva no `Payment`

- `external_id` ← `response.id`
- `pix_qr_code` ← `response.point_of_interaction.transaction_data.qr_code`
- `pix_qr_code_base64` ← `response.point_of_interaction.transaction_data.qr_code_base64`
- `pix_copy_paste` ← mesmo do `qr_code` (ou `ticket_url` como fallback)

### 9.4 Polling no mobile

O app fica em `app/payment/[id].tsx` e dispara:

```ts
// a cada 5s, até 180 tentativas (15 min) ou até status !== "pending"
const poll = setInterval(async () => {
  const p = await api.get(`/payments/${id}`);
  if (p.status === 'approved') { stop(); navigate('/success'); }
}, 5000);
```

Também reage a `AppState.change` (quando o usuário volta do app do banco) para
forçar uma nova consulta imediatamente.

### 9.5 Lock anti-duplicação

`PaymentService` mantém um `ConcurrentDictionary<Guid, SemaphoreSlim>` chaveado
pelo `requestId`. Se o paciente clicar "gerar PIX" duas vezes em sequência, a
segunda chamada espera a primeira terminar e reaproveita o PIX já criado, em vez
de disparar dois QRs no MP.

---

## 10. Cartão — Fluxo Detalhado

### 10.1 Tokenização no cliente

O **Brick do Mercado Pago** roda no front e devolve um `token` que representa
o cartão (o número bruto **nunca** passa pelo back-end RenoveJá → PCI compliance).

### 10.2 Request

```json
POST /api/payments
{
  "requestId": "550e8400-...",
  "paymentMethod": "credit_card",
  "token": "TEST-1234-abc...",
  "installments": 3,
  "paymentMethodId": "visa",
  "issuerId": 25,
  "payerEmail": "paciente@exemplo.com",
  "payerCpf": "12345678909",
  "saveCard": true
}
```

### 10.3 O que o back-end envia

```json
POST https://api.mercadopago.com/v1/payments

{
  "transaction_amount": 49.90,
  "description": "Prescrição controlada - RenoveJá",
  "installments": 3,
  "token": "TEST-1234-abc...",
  "payment_method_id": "visa",
  "issuer_id": 25,
  "external_reference": "550e8400-...",
  "notification_url": "https://.../api/payments/webhook",
  "payer": {
    "email": "paciente@exemplo.com",
    "identification": { "type": "CPF", "number": "12345678909" }
  }
}
```

### 10.4 Particularidades

- **CPF é validado** (11 dígitos + módulo 11). Em ambiente TEST, é substituído
  automaticamente por `12345678909` (CPF de teste oficial do MP).
- **Resposta pode ser síncrona.** Ao contrário do PIX, o cartão geralmente
  retorna `status` imediatamente (`approved` / `in_process` / `rejected`).
- Se vier `approved` na hora, o `Payment` e o `MedicalRequest` já sobem para
  `Approved` / `Paid` dentro do mesmo request HTTP, sem esperar webhook.
- Se vier `rejected`, `status_detail` é salvo (`cc_rejected_insufficient_amount`,
  `cc_rejected_bad_filled_security_code`, etc.) e retornado ao cliente.

### 10.5 Parcelamento

O campo `installments` aceita 1..12. O valor total **não muda** (o MP calcula
os juros por parcela conforme configuração da conta). O back-end apenas repassa
o número escolhido pelo paciente.

---

## 11. Cartões Salvos

### 11.1 Salvar um cartão novo

```http
POST /api/payments/add-card
{ "token": "TEST-1234...", "paymentMethodId": "visa" }
```

Fluxo interno:
1. Se o paciente ainda não tem `MpCustomerId` → `POST /v1/customers` no MP
2. `POST /v1/customers/{id}/cards` com o token
3. Grava `SavedCard { UserId, MpCustomerId, MpCardId, LastFour, Brand }`

### 11.2 Pagar com cartão salvo

```http
POST /api/payments/saved-card
{ "requestId": "...", "savedCardId": "...", "token": "novo-token-com-CVV" }
```

⚠️ O MP **exige um token novo toda vez**, porque o CVV precisa ser re-informado
por PCI compliance. O Brick é usado apenas para capturar o CVV e devolver o token.

### 11.3 Listar cartões

```http
GET /api/payments/saved-cards
→ [
    { "id": "...", "mpCardId": "...", "lastFour": "1234", "brand": "visa" }
  ]
```

---

## 12. Checkout Pro

**Fallback universal.** Se o paciente preferir pagar em uma tela hospedada pelo
próprio Mercado Pago (sem digitar nada no app), chamamos:

```http
GET /api/payments/checkout-pro/{requestId}
→ { "initPoint": "https://www.mercadopago.com.br/checkout/v1/...", "paymentId": "..." }
```

Internamente: cria uma **preference** no MP (`POST /checkout/preferences`)
passando `back_urls` para `success/pending/failure`. O app/browser abre a URL
e o fluxo continua no domínio do MP. O resultado volta via webhook como qualquer
outro pagamento.

---

## 13. Webhooks

### 13.1 Formato recebido

Mercado Pago pode mandar em **dois formatos**, e o handler suporta os dois:

```json
// Formato novo
{ "action": "payment.updated", "data": { "id": "1234567890" } }

// Formato antigo
{ "type": "payment", "id": "1234567890", "topic": "payment" }
```

E também via **query string**: `POST /api/payments/webhook?data.id=1234567890`

### 13.2 Validação HMAC-SHA256

Header recebido:
```
X-Signature: ts=1712345678,v1=8a3b2c1d...
X-Request-Id: 9f1a2b3c-...
```

Algoritmo (de `PaymentWebhookHandler`):
```
manifest = $"id:{data.id};request-id:{x-request-id};ts:{ts};"
expected = HMAC_SHA256(WebhookSecret, manifest)
válido se expected == v1
```

O handler tenta **vários formatos de manifest** (MP mudou o padrão algumas vezes).
Se todos falharem **mas o pagamento já estiver processado anteriormente**, ele
retorna 200 assim mesmo (idempotência) — evita alertas falsos no painel do MP.

### 13.3 Idempotência

`X-Request-Id` é gravado em `webhook_events.mercado_pago_request_id`. Se chegar
outro webhook com o mesmo id:
1. `IsDuplicate = true`
2. Retorna 200 sem reprocessar

### 13.4 Não confie no webhook — re-valide

```csharp
// Mesmo que o webhook diga "approved", o handler SEMPRE faz:
var realStatus = await _mercadoPago.GetPaymentStatusAsync(paymentId);
if (realStatus != "approved") return;  // ignora webhook mentiroso
```

Isso protege contra webhooks forjados que passem pelo HMAC (ex: se o secret vazar).

---

## 14. Sincronização Manual

Webhooks podem falhar (rede, DNS, deploy reiniciando etc). Por isso existe:

```http
POST /api/payments/sync-status/{requestId}
```

Que é chamado pelo front-end quando:
- O paciente clica em "Já paguei, por que não atualizou?"
- O polling do PIX expira e o usuário volta para o app
- O back detecta divergência entre `Payment.Status = Pending` e tempo > 30min

Internamente, faz exatamente o mesmo que o webhook (consulta MP, compara status,
atualiza banco, publica SignalR) — só que **iniciado pelo cliente**.

---

## 15. Consultas por Minuto

### 15.1 Modelo

Ao criar uma consulta, o paciente escolhe **duração contratada** (15/30/45/60 min):

```csharp
public class MedicalRequest
{
    public string?   ConsultationType       { get; }  // "psicologo"|"medico_clinico"
    public int?      ContractedMinutes      { get; }
    public decimal?  PricePerMinute         { get; }
    public DateTime? ConsultationStartedAt  { get; }
}
```

Preço: `ContractedMinutes * PricePerMinute`
- `psicologo` → R$ 3,99/min
- `medico_clinico` → R$ 6,99/min

### 15.2 Banco de Horas

Se o paciente pagou 60 min mas a consulta durou 40 min, sobram 20 min de
**crédito**. Na próxima consulta do mesmo tipo, o sistema aplica o crédito
primeiro. Se o crédito cobre a consulta inteira → preço vira **0** → o pedido
pula o passo de pagamento (vai direto para `Paid` sem chamar o MP).

### 15.3 Fim da consulta

```
ConsultationStartedAt = {quando ambos entraram na sala}
duraçãoReal = now - ConsultationStartedAt

if (duraçãoReal < ContractedMinutes)
    paciente.BancoDeHoras += (ContractedMinutes - duraçãoReal)
```

---

## 16. Reembolso e Cancelamento

### 16.1 Cancelamento de pedido

`POST /api/requests/{id}/cancel` (apenas paciente):
- Só permitido enquanto `Status <= ApprovedPendingPayment`
- `request.Cancel()` → Status = `Cancelled`
- Se existir um `Payment(Pending)` associado, ele fica **órfão** (não há limpeza automática — melhoria futura)
- Se já existe `Payment(Approved)`, o cancelamento **não dispara reembolso**. Terá que ser manual via painel MP.

### 16.2 Reembolso

- `Payment.Refund()` existe no domínio (`Approved → Refunded`)
- **NÃO existe endpoint HTTP** para disparar isso
- **NÃO existe chamada** `POST /v1/payments/{id}/refunds` no MP
- Para implementar: adicionar endpoint `POST /api/payments/{id}/refund`, chamar MP, atualizar status local, reverter `MedicalRequest` se fizer sentido

---

## 17. Notificações

### 17.1 Push (via Expo/FCM)

Disparadas por `PushNotificationRules` em:

| Evento | Destinatário | Mensagem |
|---|---|---|
| Pedido aprovado pelo médico | Paciente | "Pagamento pendente — R$ X,XX" |
| Pagamento recebido (consulta) | Médico | "Consulta paga, entre na sala" |
| Pagamento recebido (receita) | Médico | "Pagamento recebido — assinar documento" |
| Pagamento aprovado | Paciente | "Pagamento confirmado!" |
| Pedido rejeitado | Paciente | "Pedido recusado: {motivo}" |

### 17.2 In-App (persistentes)

`Notification` grava no banco:
- "Pagamento Criado" (quando PIX é gerado)
- "Consulta Pronta" (quando consulta é paga)
- "Pagamento com cartão" (sucesso/falha)

### 17.3 SignalR — tempo real

Hub: `RequestsHub`. Evento publicado quando pagamento muda o estado do pedido:

```ts
connection.on('RequestUpdated', (event) => {
  // event = { requestId, patientId, doctorId, status, message }
});
```

Usado pelo dashboard do médico (`frontend-web`) para atualizar a fila sem refresh.

### 17.4 E-mail (SMTP)

Configurado em `Smtp:*` no `appsettings.json` mas não há templates específicos
de pagamento no código. Usado mais para recuperação de senha e cadastro.

---

## 18. Repasse para o Médico

**Status atual: NÃO IMPLEMENTADO no código.**

O dinheiro cai integralmente na conta Mercado Pago da empresa. Não há:
- Split automático (estilo Stripe Connect)
- Tabela de comissões
- Tela de "saldo do médico"
- Fluxo de saque (payout)

**O que existe:** no `MedicalRequest` ficam o `DoctorId` e o `PaidAt`, o que
permite construir um relatório financeiro por médico **offline** (futuro).

---

## 19. Configuração

### 19.1 `appsettings.json`

```json
{
  "MercadoPago": {
    "AccessToken":    "APP_USR-xxxxxxxx-xxxxxx-xxxxxxxx",
    "PublicKey":      "APP_USR-xxxxxxxx-xxxx-xxxx-xxxx",
    "NotificationUrl":"https://api.renovejasaude.com.br/api/payments/webhook",
    "WebhookSecret":  "segredo-do-painel-do-mp"
  },
  "Api": {
    "BaseUrl": "https://api.renovejasaude.com.br"
  }
}
```

- **TEST tokens** começam com `TEST-` → usam cartões de teste do MP
- **PROD tokens** começam com `APP_USR-` → dinheiro real
- `Api:BaseUrl` é usado para montar `NotificationUrl` dinamicamente em dev (detecta ngrok)

### 19.2 Variáveis de ambiente equivalentes

```bash
MercadoPago__AccessToken=APP_USR-...
MercadoPago__PublicKey=APP_USR-...
MercadoPago__NotificationUrl=https://.../api/payments/webhook
MercadoPago__WebhookSecret=...
```

### 19.3 Cartões de teste oficiais

| Brand | Número | CVV | Vencimento | Resultado |
|---|---|---|---|---|
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | Aprovado |
| Master | 5031 4332 1540 6351 | 123 | 11/25 | Aprovado |
| Amex | 3711 8030 3257 522 | 1234 | 11/25 | Aprovado |
| Visa | 4013 5406 8274 6260 | 123 | 11/25 | Recusado por fundos |

Nome do titular para simular resultado: `APRO` (aprovado), `OTHE` (recusado), etc.

---

## 20. Tabelas do Banco

```sql
-- Pagamentos
CREATE TABLE payments (
    id                 UUID PRIMARY KEY,
    request_id         UUID NOT NULL REFERENCES medical_requests(id),
    user_id            UUID NOT NULL REFERENCES users(id),
    amount             NUMERIC(10,2) NOT NULL,
    status             VARCHAR(20) NOT NULL,    -- pending|approved|rejected|refunded
    payment_method     VARCHAR(30) NOT NULL,    -- pix|credit_card|debit_card|checkout_pro
    external_id        VARCHAR(100),            -- id do MP
    pix_qr_code        TEXT,
    pix_qr_code_base64 TEXT,
    pix_copy_paste     TEXT,
    paid_at            TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL,
    updated_at         TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_payments_request_id  ON payments(request_id);
CREATE INDEX ix_payments_external_id ON payments(external_id);
CREATE INDEX ix_payments_status      ON payments(status);

-- Tentativas de pagamento (auditoria de chamadas ao MP)
CREATE TABLE payment_attempts (
    id                        UUID PRIMARY KEY,
    payment_id                UUID NOT NULL,
    request_id                UUID NOT NULL,
    user_id                   UUID NOT NULL,
    correlation_id            VARCHAR(40) NOT NULL,
    payment_method            VARCHAR(30),
    amount                    NUMERIC(10,2),
    mercado_pago_payment_id   VARCHAR(100),
    mercado_pago_preference_id VARCHAR(100),
    request_url               TEXT,
    request_payload           TEXT,
    response_payload          TEXT,
    response_status_code      INT,
    response_status_detail    VARCHAR(120),
    error_message             TEXT,
    is_success                BOOLEAN,
    created_at                TIMESTAMPTZ NOT NULL
);

-- Cartões salvos
CREATE TABLE saved_cards (
    id             UUID PRIMARY KEY,
    user_id        UUID NOT NULL,
    mp_customer_id VARCHAR(100) NOT NULL,
    mp_card_id     VARCHAR(100) NOT NULL,
    last_four      VARCHAR(4),
    brand          VARCHAR(30),
    created_at     TIMESTAMPTZ NOT NULL
);

-- Eventos de webhook
CREATE TABLE webhook_events (
    id                      UUID PRIMARY KEY,
    mercado_pago_payment_id VARCHAR(100),
    mercado_pago_request_id VARCHAR(100) UNIQUE,   -- X-Request-Id (idempotência)
    webhook_type            VARCHAR(50),
    webhook_action          VARCHAR(50),
    raw_payload             TEXT,
    source_ip               VARCHAR(45),
    is_duplicate            BOOLEAN DEFAULT false,
    is_processed            BOOLEAN DEFAULT false,
    processing_error        TEXT,
    processed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL
);

-- Tabela de preços (fonte da verdade)
CREATE TABLE product_prices (
    id           SERIAL PRIMARY KEY,
    product_type VARCHAR(30) NOT NULL,  -- prescription|exam|consultation
    subtype      VARCHAR(30) NOT NULL,  -- simples|controlado|azul|default
    price_brl    NUMERIC(10,2) NOT NULL,
    is_active    BOOLEAN DEFAULT true,
    UNIQUE(product_type, subtype)
);
```

---

## 21. Auditoria

### 21.1 Rastrear um pagamento ponta a ponta

Dado um `paymentId` (UUID interno):

```sql
-- 1) Ver o pagamento atual
SELECT * FROM payments WHERE id = '...';

-- 2) Ver todas as chamadas feitas ao MP (incluindo falhas)
SELECT request_url, response_status_code, response_status_detail, created_at
FROM payment_attempts
WHERE payment_id = '...'
ORDER BY created_at;

-- 3) Ver todos os webhooks que chegaram para esse MP payment
SELECT webhook_action, is_processed, processing_error, created_at
FROM webhook_events
WHERE mercado_pago_payment_id = (SELECT external_id FROM payments WHERE id = '...');
```

### 21.2 `CorrelationId`

Cada request HTTP ao MP recebe um `CorrelationId` único que é logado em todos
os lugares (`PaymentAttempt.CorrelationId`, logs estruturados). Útil para
procurar no Serilog/Seq quando um paciente reclamar:

```
correlationId:"a1b2c3d4" → Payment criado, MP respondeu 201, QR gerado
correlationId:"a1b2c3d4" → Webhook chegou, status approved
correlationId:"a1b2c3d4" → Request marcado como Paid
```

---

## 22. Frontend

### 22.1 Mobile (React Native / Expo)

**Arquivos principais:**

| Arquivo | O que faz |
|---|---|
| `app/payment/request/[requestId].tsx` | Entry point. Busca o pedido, mostra resumo + escolha de método |
| `app/payment/[id].tsx` | Tela do PIX (QR + polling) |
| `app/payment/card.tsx` | Tela de cartão (carrega Brick do MP) |
| `components/payment/PaymentMethodSelection.tsx` | Botões PIX / Cartão |
| `components/payment/PaymentHeader.tsx` | Cabeçalho com valor e countdown |
| `lib/api-payments.ts` | Funções de chamada (`createPayment`, `syncStatus`, `getSavedCards`, ...) |
| `lib/hooks/usePaymentQuery.ts` | React Query hook com polling configurável |
| `lib/config/pricing.ts` | Fallback de preços |

**Deeplinks:** push notifications geram `renoveja://payment/request/{requestId}` que cai direto na tela 1 acima.

### 22.2 Web (React)

O frontend web é focado no médico — **não há UI de pagamento para paciente**.
O que existe é exibição de status:

- `pages/doctor/DoctorRequests.tsx` — lista com badges (`Aguardando pagamento`, `Pago`, ...)
- `components/doctor/request/RequestActionsCard.tsx` — botão "Aprovar" que dispara o fluxo

---

## 23. Troubleshooting

### ❌ PIX gerado mas nunca atualiza

1. Ver `webhook_events` → chegou algum com esse `mercado_pago_payment_id`?
2. Se **sim** + `is_processed=false` → olhar `processing_error`
3. Se **não** → webhook não chegou. Causas comuns:
   - `NotificationUrl` errado no `appsettings`
   - Firewall/CDN bloqueando o MP (checar IP do MP nos logs do Nginx)
   - Ambiente dev sem ngrok ativo
4. **Solução manual:** `POST /api/payments/sync-status/{requestId}` — consulta o MP direto.

### ❌ Webhook chega com 401 (HMAC inválido)

1. Confirmar `MercadoPago:WebhookSecret` igual ao do painel do MP (Aba **Webhooks**)
2. Se você **acabou de trocar o secret**, reinicie a API (pode estar em cache)
3. Se o secret está certo, o MP pode estar usando um formato de manifest novo:
   ver `PaymentWebhookHandler.TryValidateSignature` e adicionar o novo formato

### ❌ Cartão recusado com `cc_rejected_bad_filled_security_code`

Paciente digitou CVV errado. Mostrar mensagem amigável e pedir pra tentar de novo.

### ❌ Cartão recusado com `cc_rejected_other_reason`

Banco emissor recusou — normalmente por antifraude. Sugerir PIX como alternativa.

### ❌ `Price não configurado` ao aprovar pedido

Faltou linha em `product_prices` para aquele `(product_type, subtype)`.
Rodar:

```sql
INSERT INTO product_prices (product_type, subtype, price_brl, is_active)
VALUES ('prescription', 'azul', 129.90, true);
```

### ❌ PIX duplicado (dois QRs gerados em 1 segundo)

O `SemaphoreSlim` por `requestId` deveria ter segurado. Se ocorreu, verificar:
1. Se há mais de uma instância da API rodando (load balancer) — o lock é **in-memory** e não distribuído
2. Solução: implementar lock distribuído (Redis SETNX) para cenário multi-instance

### ❌ Paciente pagou mas pedido não saiu de `ApprovedPendingPayment`

1. `SELECT * FROM payments WHERE request_id='...'`
2. Se `status='approved'` mas `request.status='ApprovedPendingPayment'` →
   bug de handler, forçar: `POST /api/payments/sync-status/{requestId}`
3. Se persistir, investigar logs do `PaymentService.ProcessWebhookAsync`

---

## 24. Glossário

| Termo | Significado |
|---|---|
| **Brick** | Widget oficial do MP para tokenizar cartão no cliente |
| **Checkout Pro** | Página de pagamento hospedada pelo MP |
| **External Reference** | Campo livre enviado ao MP — usamos para guardar o `requestId` |
| **init_point** | URL de redirecionamento do Checkout Pro |
| **Copia-e-Cola** | Código PIX em texto puro (alternativa ao QR) |
| **Webhook Secret** | Chave do HMAC configurada no painel do MP |
| **X-Idempotency-Key** | Header enviado ao MP para evitar cobrança duplicada |
| **Banco de Horas** | Crédito de minutos do paciente em consultas |
| **ApprovedPendingPayment** | Status de pedido "médico aprovou, falta pagar" |

---

## 25. Mapa de Arquivos

### Back-end (.NET)

```
backend-dotnet/
├── src/
│   ├── RenoveJa.Domain/
│   │   ├── Entities/
│   │   │   ├── Payment.cs                      ★ entidade principal
│   │   │   ├── PaymentAttempt.cs               ★ auditoria de chamadas ao MP
│   │   │   ├── SavedCard.cs                    ★ cartão tokenizado
│   │   │   ├── WebhookEvent.cs                 ★ auditoria de webhooks
│   │   │   └── MedicalRequest.cs               ← conecta pedido ↔ pagamento
│   │   └── Enums/
│   │       ├── PaymentStatus.cs
│   │       └── RequestStatus.cs
│   │
│   ├── RenoveJa.Application/
│   │   ├── Services/Payments/
│   │   │   ├── PaymentService.cs               ★ regras de negócio (~900 linhas)
│   │   │   └── PaymentWebhookHandler.cs        ★ validação HMAC + idempotência
│   │   ├── Services/Requests/
│   │   │   └── RequestApprovalService.cs       ← lookup de preço
│   │   ├── Configuration/
│   │   │   └── MercadoPagoConfig.cs
│   │   └── DTOs/Payments/
│   │       └── PaymentDtos.cs                  ★ DTOs de entrada/saída
│   │
│   ├── RenoveJa.Infrastructure/
│   │   ├── Payments/
│   │   │   └── MercadoPagoService.cs           ★ cliente HTTP do MP (~580 linhas)
│   │   └── Repositories/
│   │       ├── PaymentRepository.cs
│   │       ├── PaymentAttemptRepository.cs
│   │       ├── SavedCardRepository.cs
│   │       ├── WebhookEventRepository.cs
│   │       └── ProductPriceRepository.cs       ← tabela de preços
│   │
│   └── RenoveJa.Api/
│       └── Controllers/
│           ├── PaymentsController.cs           ★ 13 endpoints
│           └── RequestApprovalController.cs    ← POST /approve
│
└── docs/
    ├── MERCADOPAGO.md                          ← doc técnica do MP
    ├── OBTER_TOKEN_MERCADOPAGO.md
    └── FLUXO_RECEITA.md
```

### Frontend Mobile

```
frontend-mobile/
├── app/
│   └── payment/
│       ├── [id].tsx                            ★ tela PIX (polling)
│       ├── card.tsx                            ★ tela cartão (Brick)
│       └── request/
│           └── [requestId].tsx                 ★ entry point (escolha de método)
├── components/
│   └── payment/
│       ├── PaymentHeader.tsx
│       └── PaymentMethodSelection.tsx
└── lib/
    ├── api-payments.ts                         ★ client HTTP
    ├── config/pricing.ts                       ← fallback de preços
    └── hooks/usePaymentQuery.ts                ← React Query + polling
```

### Frontend Web

```
frontend-web/
└── src/
    ├── pages/doctor/
    │   ├── DoctorRequests.tsx                  ← lista + badges de status
    │   └── DoctorRequestDetail.tsx
    └── components/doctor/request/
        └── RequestActionsCard.tsx              ← botão "Aprovar"
```

---

## 🎯 TL;DR (se você só tem 30 segundos)

1. **Provedor:** Mercado Pago (único). PIX + Cartão + Checkout Pro.
2. **Modelo:** Por pedido, não por assinatura. Cada `MedicalRequest` tem 1 `Payment`.
3. **Preço:** Vem do banco (`product_prices`), nunca do cliente. Médico aprova → preço fixa.
4. **Fluxo:** `Submitted → InReview → ApprovedPendingPayment → [paciente paga] → Paid → Signed/Delivered`
5. **Confirmação:** Webhook do MP → `PaymentWebhookHandler` valida HMAC + consulta status real no MP → atualiza `Payment.Status` e `Request.Status`
6. **Consulta:** Cobrada por minuto contratado. Sobras viram banco de horas (consulta futura = R$ 0 = sem gateway).
7. **Repasse:** ❌ Não implementado. Dinheiro fica tudo na conta MP da empresa.
8. **Reembolso:** ⚠️ Método de domínio existe, endpoint HTTP não.
9. **Idempotência:** `X-Request-Id` do MP + `external_id` no banco + `SemaphoreSlim` por `requestId`.
10. **Fallback:** `POST /api/payments/sync-status/{requestId}` quando o webhook não chega.

---

**FIM DO DOCUMENTO.** Para mudanças no fluxo, abra PR tocando em:
`PaymentService.cs`, `MercadoPagoService.cs`, `PaymentWebhookHandler.cs`,
`RequestApprovalService.cs` — e atualize esta doc.
