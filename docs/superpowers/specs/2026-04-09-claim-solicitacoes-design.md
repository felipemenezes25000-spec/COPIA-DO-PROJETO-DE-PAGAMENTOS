# Design — Claim de solicitações (first-come-first-serve)

**Data:** 2026-04-09
**Status:** Em revisão
**Autor:** Felipe + Claude (brainstorming session)

## Contexto e motivação

Hoje, quando um paciente cria uma solicitação (receita, exame ou consulta), ela fica
disponível para **todos os médicos** verem e aprovarem — isso já funciona via a query
combinada `GetByDoctorIdAsync(meuId) + GetAvailableForQueueAsync()` dentro de
`RequestQueryService.GetUserRequestsPagedAsync` (backend-dotnet/src/RenoveJa.Application/
Services/Requests/RequestQueryService.cs:119-144).

O problema: **não há travamento antes da aprovação**. Dois médicos podem abrir o mesmo
pedido ao mesmo tempo e começar a escrever conduta em paralelo. Só no momento do
`POST /requests/{id}/approve` é que o guard em `RequestApprovalService.cs:45-49`
detecta o conflito e retorna 401 pro segundo médico — que já perdeu o trabalho.

Feedback do Felipe (sessão de brainstorming 2026-04-09):
> "As solicitações dos pacientes têm que aparecer pra todo mundo — quem pegar
> primeiro, some pro outro médico."

## Escopo acordado

Decisões tomadas durante o brainstorming:

| Decisão | Valor |
|---------|-------|
| Visibilidade da fila | **Global** — qualquer médico vê qualquer pendente (sem filtro de especialidade/município) |
| Momento do claim | **Explícito** — botão "Iniciar revisão"; antes disso o detalhe é read-only e continua visível pros outros |
| Abandono | **Timeout automático de 10 minutos** — passou do tempo sem aprovar/rejeitar, volta pra fila global e qualquer médico (inclusive outro) pode pegar |
| Devolução manual | Fora de escopo (P2) |
| Aviso de "tempo acabando" | Fora de escopo |

## Arquitetura (fluxo)

```
Paciente cria → doctor_id=NULL, status=submitted
                        │
                        ▼
             Todos os médicos veem (fila global já existe)
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    Médico A abre  Médico B abre   Médico C abre
   (detalhe R/O)  (detalhe R/O)  (detalhe R/O)
         │              │              │
         ▼              ▼              ▼
    clica "Iniciar revisão"
         │
         ▼
    POST /api/requests/{id}/claim
    (UPDATE ... WHERE doctor_id IS NULL — atômico)
         │
    ┌────┴────┐
    ▼         ▼
  sucesso   409 Conflict
  (A ganha) (B, C veem "já foi pego por outro")
    │
    ▼
  SignalR broadcast: RequestClaimed {id, by}
    │
    ▼
  Lista de B, C: card some automaticamente
    │
    ▼
  [10 min depois, se A não finalizou]
  ClaimTimeoutBackgroundService libera
  → doctor_id=NULL, status=submitted, SignalR: RequestReleased {id}
  → card reaparece na fila de todos
```

## Unidades de implementação

### 1. Backend — Schema

**Nova migration** (via `MigrationRunner.cs`, padrão do projeto):

```sql
ALTER TABLE public.requests
  ADD COLUMN claimed_at TIMESTAMPTZ NULL;

CREATE INDEX idx_requests_claimed_at
  ON public.requests (claimed_at)
  WHERE claimed_at IS NOT NULL AND doctor_id IS NOT NULL;
```

Índice parcial para otimizar o scan do background service de timeout.

### 2. Backend — Domínio

Em `MedicalRequest.cs`:

- **Nova propriedade:** `public DateTime? ClaimedAt { get; private set; }`
- **Novo método `ClaimBy(Guid doctorId, string doctorName)`:**
  - Precondição: `DoctorId == null`. Se não, lança `DomainException("Pedido já foi pego por outro médico")`.
  - Chama `AssignDoctor(doctorId, doctorName)` (que já transiciona para `InReview` nos tipos não-consulta).
  - Seta `ClaimedAt = DateTime.UtcNow`.
- **Novo método `ReleaseClaim()`:**
  - Precondição: `Status == InReview && DoctorId.HasValue && ClaimedAt.HasValue`.
  - Zera `DoctorId`, `DoctorName`, `ClaimedAt`.
  - Volta `Status = Submitted`.
  - Atualiza `UpdatedAt`.

**Snapshot/Reconstitute:** adicionar `ClaimedAt` ao `MedicalRequestSnapshot` e
propagar em `RequestRepository.MapToDomain` + persistência.

### 3. Backend — Repository (claim atômico)

Novo método em `IRequestRepository`:

```csharp
Task<bool> TryClaimAsync(
    Guid requestId,
    Guid doctorId,
    string doctorName,
    CancellationToken cancellationToken = default);
```

Implementação em `RequestRepository.cs`:

```sql
UPDATE public.requests
   SET doctor_id   = @doctorId,
       doctor_name = @doctorName,
       status      = 'in_review',
       claimed_at  = NOW(),
       updated_at  = NOW()
 WHERE id = @requestId
   AND doctor_id IS NULL
   AND status IN ('submitted','pending','analyzing','searching_doctor')
RETURNING id;
```

Retorna `true` se 1 linha afetada, `false` caso contrário (já claimado ou status
inválido). **Postgres MVCC garante atomicidade**: a condicional `WHERE doctor_id IS NULL`
é reavaliada no momento do UPDATE. Sem lock explícito, sem transação serializable.

### 4. Backend — Application Service

Novo `IRequestClaimService` + `RequestClaimService`:

```csharp
public interface IRequestClaimService
{
    Task<ClaimResult> ClaimAsync(Guid requestId, Guid doctorId, CancellationToken ct);
    Task<ReleaseResult> ReleaseTimeoutAsync(Guid requestId, CancellationToken ct);
}
```

`ClaimAsync`:
1. Carrega `User` do médico (para ter o nome).
2. Chama `requestRepository.TryClaimAsync(requestId, doctorId, user.Name, ct)`.
3. Se `false`: carrega o pedido e retorna `ClaimResult.Conflict(currentHolderName)`.
4. Se `true`: publica SignalR `RequestClaimed` + audit log `RequestClaimed` + retorna `ClaimResult.Success(request)`.

Registrado em `ServiceCollectionExtensions.AddApplicationServices()`.

### 5. Backend — Controller

**Decisão:** adicionar endpoints a `RequestsController` em vez de criar novo controller
— mantém proximidade com o CRUD das solicitações.

```csharp
[HttpPost("{id}/claim")]
[Authorize(Roles = "doctor")]
public async Task<IActionResult> Claim(string id, CancellationToken ct)
{
    var resolvedId = await ResolveRequestIdAsync(id, ct);
    if (resolvedId == null) return NotFound();

    var doctorId = GetUserId();
    var result = await requestClaimService.ClaimAsync(resolvedId.Value, doctorId, ct);

    return result switch
    {
        { Success: true } => Ok(new { request = result.Request }),
        { Conflict: true } => Conflict(new
        {
            error = $"Outro médico ({result.CurrentHolderName}) já pegou este pedido.",
            claimedBy = result.CurrentHolderName
        }),
        _ => BadRequest(new { error = result.ErrorMessage })
    };
}
```

### 6. Backend — Background service

Novo `ClaimTimeoutBackgroundService : BackgroundService` em
`Api/Services/ClaimTimeoutBackgroundService.cs`:

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    while (!stoppingToken.IsCancellationRequested)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IRequestRepository>();
            var publisher = scope.ServiceProvider.GetRequiredService<IRequestEventsPublisher>();

            var released = await repo.ReleaseStaleClaimsAsync(
                TimeSpan.FromMinutes(10), stoppingToken);

            foreach (var id in released)
                await publisher.NotifyRequestReleasedAsync(id, stoppingToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Claim timeout sweep failed");
        }

        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
    }
}
```

Novo método no repository:

```sql
UPDATE public.requests
   SET doctor_id   = NULL,
       doctor_name = NULL,
       status      = 'submitted',
       claimed_at  = NULL,
       updated_at  = NOW()
 WHERE status = 'in_review'
   AND claimed_at IS NOT NULL
   AND claimed_at < NOW() - INTERVAL '10 minutes'
RETURNING id;
```

Registrado como `AddHostedService<ClaimTimeoutBackgroundService>()` em `Program.cs`.

**Dívida técnica aceita:** Mesma limitação multi-instância do batch sign
(memória `project_batch_sign_audit.md`). Se o backend rodar em 2+ pods, 2 pods
executam o UPDATE ao mesmo tempo. Como o UPDATE é idempotente (`WHERE status='in_review'`
só casa uma vez por linha), não há corrupção — mas o SignalR event pode duplicar.
At-least-once delivery é aceitável pois o frontend invalida o cache de qualquer jeito.
Fix definitivo (Redis lock) fica como follow-up alinhado ao batch sign.

### 7. Backend — SignalR events

Em `IRequestEventsPublisher` (interface nova ou estender a existente):

```csharp
Task NotifyRequestClaimedAsync(Guid requestId, string doctorName, CancellationToken ct);
Task NotifyRequestReleasedAsync(Guid requestId, CancellationToken ct);
```

Broadcast via `RequestsHub` (que já existe para o batch sign e updates). Grupo:
todos os conectados com role=doctor (ou canal único "doctors-queue" — ver padrão
atual do `NotifyRequestUpdatedAsync`).

Payload:
- `RequestClaimed` → `{ requestId, claimedBy, claimedAt }`
- `RequestReleased` → `{ requestId }`

### 8. Frontend-mobile — request-detail/[id].tsx (read-only)

Quando `request.doctorId == null` e o usuário tem role=doctor:

- **Esconder:** botões de editar conduta, medicamentos, "Aprovar", "Rejeitar",
  "Assinar", campos de edição.
- **Banner fixo no topo:** *"Este pedido está disponível na fila. Clique em Iniciar
  revisão para atendê-lo."*
- **Footer com botão primary:** **"Iniciar revisão"**.
- **Handler do botão:**
  ```ts
  async function handleClaim() {
    try {
      const res = await api.post(`/api/requests/${requestId}/claim`);
      queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
      router.replace(`/doctor-request/editor/${requestId}`);
    } catch (err) {
      if (err.status === 409) {
        showToast(`Dr. ${err.body.claimedBy} já pegou este pedido.`, 'info');
        queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
        router.back();
      } else {
        showToast(humanizeError(err), 'error');
      }
    }
  }
  ```

### 9. Frontend-mobile — SignalR listeners

Em `contexts/RequestsEventsContext.tsx`, adicionar:

```ts
connection.on('RequestClaimed', (payload) => {
  queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
  // Se o usuário está olhando o detalhe do pedido claimado, mostrar toast e voltar
  if (currentRouteRequestId === payload.requestId && currentUserId !== payload.claimedBy) {
    showToast(`Dr. ${payload.claimedByName} acabou de pegar este pedido.`, 'info');
    router.back();
  }
});

connection.on('RequestReleased', (payload) => {
  queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
});
```

### 10. Frontend-mobile — Modo Foco (review-queue.tsx)

**Edge case:** O modo foco congela um `queueSnapshot` ao abrir
(review-queue.tsx:122-139) e itera sequencialmente. Se outro médico claimar um
pedido **ainda não processado** do snapshot, o médico local vai tomar 409 ao aprovar.

**Solução:** Ao receber `RequestClaimed` no listener SignalR com um id que está no
`queueSnapshot` e ainda não foi aprovado/pulado/rejeitado localmente:
- Remove do snapshot.
- Se o pedido atual (`workingQueue[currentIndex]`) foi removido, avança o índice.
- Mostra toast leve: *"Dr. X pegou este pedido antes de você."*

Implementação: `setQueueSnapshot((prev) => prev?.filter(r => r.id !== payload.requestId))`
dentro do próprio componente, via hook dedicado.

### 11. Frontend-mobile — Batch sign (aprovar em lote)

**Problema:** No modo foco, o médico aprova vários pedidos e só assina em lote no
final. Entre o aprovar e o assinar, outro médico pode claimar (se a transição
para "paid" ainda não aconteceu no backend).

**Na verdade, não é problema:** o `ApproveAsync` já faz lazy-claim no backend
(`RequestApprovalService.cs:45-49`). Ao aprovar, o pedido transiciona direto
para `Paid` e não fica mais em estado claimable. Nada a fazer aqui — o comportamento
já está correto. Só precisamos garantir que o 409 humanizado chega no UI do modo
foco (tratado na unidade #10).

### 12. Frontend-web

Espelhar unidades #8 e #9 em:
- `frontend-web/src/pages/doctor/DoctorRequestDetail.tsx` (read-only + botão claim)
- `frontend-web/src/pages/doctor/DoctorRequests.tsx` (invalidação via SignalR)

Mesma semântica, mesmo endpoint, mesmo payload.

## Concorrência e garantias

| Cenário | Garantia |
|---------|----------|
| 2 médicos clicam "Iniciar revisão" simultaneamente | Postgres MVCC: `WHERE doctor_id IS NULL` na UPDATE serializa. Exatamente 1 sucesso + 1 `409 Conflict`. |
| Médico claima e perde conexão | Timeout de 10 min libera o pedido automaticamente. |
| Claim concorrente com timeout do background | A UPDATE do background tem `WHERE claimed_at < NOW() - 10min`. Se o médico ainda está dentro do janela, não é afetado. Se passou, perde — comportamento correto. |
| Multi-instância do backend (2+ pods) | Background roda em todos, mas a UPDATE é idempotente (só casa linhas realmente stale). SignalR pode duplicar events, mas invalidação do cache é idempotente. Dívida aceita. |
| Claim durante aprovação em andamento | Não acontece: o claim transita para `in_review`, e o approve exige `in_review` ou submitted. Se o médico claimou e aprova, OK. Se outro tenta claimar depois, vê 409. |

## Testes (TDD)

### Unit tests (RenoveJa.UnitTests)

1. `MedicalRequest_ClaimBy_ShouldSetInReviewAndClaimedAt`
2. `MedicalRequest_ClaimBy_ShouldThrow_WhenAlreadyClaimed`
3. `MedicalRequest_ReleaseClaim_ShouldRevertToSubmittedAndClearClaim`
4. `MedicalRequest_ReleaseClaim_ShouldThrow_WhenNotInReview`
5. `RequestClaimService_ShouldPublishSignalREvent_OnSuccess`
6. `RequestClaimService_ShouldReturnConflict_WhenRepositoryReturnsFalse`
7. `ClaimTimeoutBackgroundService_ShouldCallReleaseStaleClaims_EveryMinute`

### Integration tests

8. `TryClaimAsync_TwoConcurrentCalls_OnlyOneSucceeds` — 10 tasks em paralelo, exatamente 1 true.
9. `ClaimEndpoint_ShouldReturn409_WhenRequestAlreadyClaimed`
10. `ReleaseStaleClaimsAsync_ShouldOnlyTouchInReviewOlderThan10Min`

### Manual (smoke)

11. Dois devices logados como médicos diferentes, mesmo pedido pendente:
    - Device A clica "Iniciar revisão" → fica no editor.
    - Device B: card some da fila em < 2s.
    - Device B tenta abrir pelo shortcut → vê 409 e volta.
12. Device A claima e fecha o app. Aguardar 11 min. Verificar que card reaparece
    na fila de outros médicos e audit log tem entrada `ClaimTimedOut`.

## Fora de escopo (YAGNI)

- ❌ Endpoint `POST /api/requests/{id}/release` (devolver voluntariamente) — P2.
- ❌ Aviso visual "faltam 2 min pro timeout" no UI do médico dono.
- ❌ Redis lock para deduplicar background em multi-instância — alinhado com
  dívida existente de batch sign, follow-up unificado.
- ❌ Métricas/analytics de claim (taxa de abandono, tempo médio) — follow-up.
- ❌ Reassignment manual por admin — fluxo de admin já existe e não é impactado.
- ❌ Filtro de especialidade/município na fila — fila é **global** por decisão.

## Arquivos impactados (resumo)

**Backend:**
- `backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs` (migration)
- `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs` (ClaimBy/ReleaseClaim)
- `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequestSnapshot.cs` (ClaimedAt)
- `backend-dotnet/src/RenoveJa.Domain/Interfaces/IRequestRepository.cs` (TryClaimAsync, ReleaseStaleClaimsAsync)
- `backend-dotnet/src/RenoveJa.Infrastructure/Repositories/RequestRepository.cs` (implementações SQL)
- `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestClaimService.cs` (novo)
- `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestClaimService.cs` (novo)
- `backend-dotnet/src/RenoveJa.Api/Controllers/RequestsController.cs` (endpoint Claim)
- `backend-dotnet/src/RenoveJa.Api/Services/ClaimTimeoutBackgroundService.cs` (novo)
- `backend-dotnet/src/RenoveJa.Api/Hubs/RequestsHub.cs` (eventos — se existir; senão criar em RequestEventsPublisher)
- `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestEventsPublisher.cs` (novos métodos)
- `backend-dotnet/src/RenoveJa.Application/ServiceCollectionExtensions.cs` (DI)
- `backend-dotnet/src/RenoveJa.Api/Program.cs` (AddHostedService)
- `backend-dotnet/tests/RenoveJa.UnitTests/` (testes)

**Frontend mobile:**
- `frontend-mobile/app/request-detail/[id].tsx` (read-only + botão claim)
- `frontend-mobile/contexts/RequestsEventsContext.tsx` (listeners)
- `frontend-mobile/app/(doctor)/review-queue.tsx` (edge case modo foco)
- `frontend-mobile/lib/api-requests.ts` (função `claimRequest`)

**Frontend web:**
- `frontend-web/src/pages/doctor/DoctorRequestDetail.tsx`
- `frontend-web/src/pages/doctor/DoctorRequests.tsx`
- `frontend-web/src/lib/signalr.ts` (ou equivalente — listeners)

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Médico fica frustrado ao perder pedido no timeout de 10 min | 10 min é suficiente pra uma receita/exame simples. Follow-up: aviso visual 2 min antes se for reportado como pain point. |
| Race entre claim e approve no backend | Não existe: approve exige `in_review` e só o dono passa no guard IDOR. Testado. |
| SignalR desconectado → lista desatualizada | Já há fallback de polling (8s quando desconectado — `useDoctorRequestsQuery.ts:29`). Mantém. |
| Muitos pedidos em `in_review` travados por bugs futuros | Background de timeout auto-heals a cada 1 min. Observabilidade: audit log de cada release. |
