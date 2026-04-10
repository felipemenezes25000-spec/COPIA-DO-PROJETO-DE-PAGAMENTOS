# Visibilidade médica de rejeições automáticas pela IA

**Data:** 2026-04-07
**Status:** Design aprovado, aguardando plano de implementação
**Contexto:** Hoje o `RequestService` rejeita automaticamente solicitações de receita e exame quando a IA detecta inconsistência óbvia (nome divergente, tipo de receita errado, adulteração, ilegibilidade). O pedido nasce com `Status = Rejected` e o médico nunca o vê — não há auditoria nem possibilidade de reverter falsos positivos.

## Problema

1. O médico não sabe que a IA rejeitou um pedido, nem o motivo.
2. Falsos positivos da IA não têm caminho de reversão — o paciente precisa criar nova solicitação.
3. `MedicalRequest.RejectionReason` é um único campo usado tanto por rejeição manual quanto automática — impossível distinguir na UI.

## Objetivo

- Dar visibilidade ao médico de todos os pedidos rejeitados automaticamente pela IA, com o motivo.
- Permitir que o médico reabra um pedido rejeitado pela IA para análise manual (casos de falso positivo).
- Preservar auditoria: mesmo após reabertura e nova decisão, o motivo original da IA fica registrado.
- Notificar o paciente de forma transparente quando o pedido for reaberto.

## Não-objetivos

- Alterar o comportamento da IA em si (prompts, thresholds, detecção).
- Mudar o fluxo de rejeição manual pelo médico.
- Tocar em `Consultation` (não passa por rejeição automática da IA).
- Expor a fila de rejeitados pela IA para administradores/supervisores (escopo exclusivo do médico aprovado com a especialidade compatível).

## Decisões de design

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Comportamento da IA | Continua rejeitando automaticamente | Deixar de rejeitar e só sinalizar (contraria requisito do usuário) |
| Médico pode reverter? | Sim, reabrindo para `InReview` (B2) | Somente leitura; override direto para `Approved` |
| Modelo de dados | `RejectionSource` enum + `AiRejectionReason` separado (D1) | Booleano `RejectedByAi`; novo status `AiRejected` |
| Visibilidade da fila | Filtrada por `RequiredSpecialty` do médico (E2) | Pool global; painel admin |
| UX do paciente ao reabrir | Transparente — push + volta a `InReview` (F1) | Silencioso; híbrido |

## Arquitetura

### 1. Domain (`backend-dotnet/src/RenoveJa.Domain`)

**Novo enum** `Enums/RejectionSource.cs`:

```csharp
public enum RejectionSource { Doctor, Ai }
```

**Alterações em `Entities/MedicalRequest.cs`:**

Novas propriedades:

- `RejectionSource? RejectionSource { get; private set; }`
- `string? AiRejectionReason { get; private set; }` — preservado mesmo após reabertura
- `DateTime? AiRejectedAt { get; private set; }`
- `Guid? ReopenedBy { get; private set; }`
- `DateTime? ReopenedAt { get; private set; }`

Novo método `RejectByAi(string reason)`:

- Mesma validação de estado do `Reject` atual.
- Seta `Status = Rejected`, `RejectionSource = Ai`, `AiRejectionReason = reason`, `RejectionReason = reason` (espelhado para compat), `AiRejectedAt = UtcNow`.

Alteração em `Reject(string reason)` (rejeição manual):

- Passa a setar `RejectionSource = Doctor`.

Novo método `ReopenFromAiRejection(Guid doctorId, string doctorName)`:

- Valida `Status == Rejected && RejectionSource == Ai`, lança `DomainException` caso contrário.
- Transita `Status` para `InReview`.
- Atribui médico (`DoctorId`, `DoctorName`).
- Zera `RejectionReason` (mas mantém `AiRejectionReason`).
- Grava `ReopenedBy = doctorId`, `ReopenedAt = UtcNow`.
- Atualiza `UpdatedAt`.

**Atualização em `MedicalRequestSnapshot`:** adicionar os novos campos para fluxo de reconstituição.

### 2. Infrastructure — Postgres

**Migração** (nova, sequencial à última em `MigrationRunner.cs`):

```sql
ALTER TABLE medical_requests
  ADD COLUMN rejection_source      TEXT NULL,
  ADD COLUMN ai_rejection_reason   TEXT NULL,
  ADD COLUMN ai_rejected_at        TIMESTAMPTZ NULL,
  ADD COLUMN reopened_by           UUID NULL,
  ADD COLUMN reopened_at           TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS ix_medical_requests_ai_rejected
  ON medical_requests (required_specialty)
  WHERE status = 'rejected' AND rejection_source = 'ai';
```

Backfill: pedidos existentes com `status = 'rejected'` ficam com `rejection_source = NULL` — a UI interpreta `NULL` como rejeição legada (não aparece na nova aba).

**`RequestRepository`:** mapear os novos campos em `MapToDomain` (via snapshot) e incluí-los no `UPDATE`/`INSERT`.

### 3. Application

**`RequestService.cs`:** substituir as 6 chamadas atuais de `request.Reject(outcome.RejectionMessage!)` dentro dos blocos de IA (linhas 451, 522, 556, 609, 931, 987) por `request.RejectByAi(outcome.RejectionMessage!)`.

**`RequestApprovalService.cs`:**

Novo método `ReopenFromAiRejectionAsync(Guid id, Guid doctorId, CancellationToken ct)`:

1. Carrega request + doctor user.
2. Valida: doctor aprovado; se `request.RequiredSpecialty != null`, doctor deve ter essa especialidade.
3. `request.ReopenFromAiRejection(doctorId, doctorName)`.
4. `requestRepository.UpdateAsync`.
5. `requestEventsPublisher.NotifyRequestUpdatedAsync` (realtime).
6. `pushDispatcher.SendAsync(PushNotificationRules.ReopenedForReview(...))`.

**`PushNotificationRules.cs`:** nova regra estática `ReopenedForReview(patientId, requestId, requestType)` com mensagem amigável ("Seu pedido foi reaberto para análise médica").

**`IRequestApprovalService`:** expor o novo método.

**`IRequestQueryService` / `RequestQueryService`:** novo método `ListAiRejectedAsync(Guid doctorId, CancellationToken ct)` que:

- Descobre a especialidade do médico.
- Consulta `RequestRepository` por `status = 'rejected' AND rejection_source = 'ai'` e `required_specialty = doctor.specialty OR required_specialty IS NULL`.
- Ordena por `ai_rejected_at DESC`.
- Retorna `RequestResponseDto[]`.

**DTOs (`RequestDtos.cs` → `RequestResponseDto`):** novos campos opcionais:

- `rejectionSource?: 'ai' | 'doctor' | null`
- `aiRejectionReason?: string | null`
- `aiRejectedAt?: string | null`
- `reopenedBy?: string | null`
- `reopenedAt?: string | null`

### 4. API (`RenoveJa.Api`)

No `RequestsController`:

- `GET /api/requests/ai-rejected` → `RequestQueryService.ListAiRejectedAsync`. Autorização: role `Doctor`.
- `POST /api/requests/{id}/reopen-ai-rejection` → `RequestApprovalService.ReopenFromAiRejectionAsync`. Autorização: role `Doctor`.

### 5. Frontend-web (portal médico)

**`services/doctor-api-requests.ts`:**

- `fetchAiRejectedRequests(): Promise<RequestDto[]>`
- `reopenAiRejection(id: string): Promise<RequestDto>`

**Nova rota `/doctor/ai-rejected`:**

- Componente `DoctorAiRejectedList.tsx` — lista com badge "⚠️ Rejeitado pela IA", paciente, tipo, motivo da IA em destaque, data.
- Item clicável → navega para `DoctorRequestDetail` existente.

**`DoctorRequestDetail.tsx`:** quando `request.rejectionSource === 'ai'` e status ainda é `rejected`, renderiza banner no topo:

- Título: "Este pedido foi rejeitado automaticamente pela IA"
- Corpo: exibe `aiRejectionReason`.
- Botão primário: **"Reabrir para análise"** → chama `reopenAiRejection(id)`, atualiza estado local, mostra toast, mantém usuário no detalhe (que agora mostra o pedido em `InReview` e ações normais).
- Botão secundário: **"Voltar"** → volta para a lista.

**Menu/badge:** adicionar entrada "Rejeitados pela IA" na navegação do médico, com contagem (mesma query).

### 6. Frontend-mobile (paciente)

- Nenhuma mudança de filtragem: o pedido reaberto volta a `InReview` e some naturalmente da aba "Rejeitados" (filtro por status já existe).
- `hooks/useNotifications` (ou equivalente): tratar novo tipo `reopened_for_review` mostrando toast amigável "Seu pedido foi reaberto para análise médica" e invalidando a query de requests.

## Fluxo completo (exemplo)

1. Paciente envia receita de controle especial marcada como "simples".
2. IA detecta inconsistência → `RejectByAi("...tipo divergente...")`.
3. Pedido nasce `Rejected`, `RejectionSource = Ai`, paciente recebe push de rejeição.
4. Médico (mesma especialidade) entra no portal → vê a aba "Rejeitados pela IA (3)".
5. Abre o pedido, vê o banner com motivo, clica em "Reabrir para análise".
6. Backend: `ReopenFromAiRejection` → status `InReview`, doctor atribuído, push para paciente "pedido reaberto".
7. Paciente vê o pedido voltar para "Em análise" no mobile.
8. Médico analisa e aprova (ou rejeita manualmente — agora `RejectionSource = Doctor`).
9. `AiRejectionReason` continua registrado para auditoria, independentemente do desfecho final.

## Testes

**Domain (`MedicalRequestTests`):**

- `RejectByAi` seta todos os campos esperados e status = Rejected.
- `Reject` manual seta `RejectionSource = Doctor`.
- `ReopenFromAiRejection` falha quando status ≠ Rejected.
- `ReopenFromAiRejection` falha quando source ≠ Ai.
- `ReopenFromAiRejection` em caso válido: transita para InReview, atribui médico, preserva `AiRejectionReason`, zera `RejectionReason`.

**Application (`RequestServiceTests` / `RequestApprovalServiceTests`):**

- `ReopenFromAiRejectionAsync` happy path.
- `ReopenFromAiRejectionAsync` falha com especialidade incompatível.
- `ReopenFromAiRejectionAsync` falha em pedido rejeitado manualmente.
- `ListAiRejectedAsync` retorna só pedidos com source = Ai e especialidade compatível.

**Frontend-web:**

- Render do banner em `DoctorRequestDetail` quando `rejectionSource === 'ai'`.
- Click em "Reabrir" dispara chamada de API e atualiza estado.
- Lista `DoctorAiRejectedList` renderiza itens com motivo da IA.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Corrida: dois médicos tentam reabrir o mesmo pedido | `ReopenFromAiRejection` no domain valida status atual; segunda chamada falha com `DomainException`. |
| Paciente recria pedido enquanto o médico reabre o antigo | Permitido — são pedidos distintos. UI do paciente mostra ambos no histórico. |
| Pedidos rejeitados legados (source = NULL) poluem a aba | Query filtra explicitamente por `rejection_source = 'ai'` — legados ficam fora. |
| Médico reabre em massa por curiosidade | Auditoria completa (`ReopenedBy`/`ReopenedAt`) permite análise post-hoc. Fora do escopo desta fase: rate limiting. |
| Compatibilidade: callers antigos de `Reject` esperam source null | `Reject` manual agora seta `Doctor`; nenhum caller depende de null. |

## Pendências fora de escopo

- Rate limiting de reaberturas por médico.
- Dashboard admin com métricas "% de reaberturas sobre total de rejeições da IA" (bom indicador de qualidade do modelo).
- Feedback loop para o time de IA: log estruturado dos casos reabertos + decisão final, para avaliar falsos positivos.
