# Claim de Solicitações (First-Come-First-Serve) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar claim explícito ("Iniciar revisão") nas solicitações médicas. Dois médicos não devem trabalhar em paralelo no mesmo pedido — o primeiro que clica trava pros outros; se não finalizar em 10 min, volta pra fila global.

**Architecture:** Postgres MVCC como lock nativo (`UPDATE ... WHERE doctor_id IS NULL` atômico). Background service `IHostedService` libera claims stale a cada minuto. SignalR broadcast (`RequestClaimed`/`RequestReleased`) atualiza todos os médicos conectados em tempo real. Frontend (mobile + web) entra em modo read-only quando `doctorId == null` e exibe botão "Iniciar revisão".

**Tech Stack:** .NET 8 (Clean Architecture), PostgreSQL/Npgsql, SignalR, React Native/Expo Router + TanStack Query, React/Vite.

**Spec:** `docs/superpowers/specs/2026-04-09-claim-solicitacoes-design.md`

---

## File Structure

### Backend (.NET 8)

**Criar:**
- `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestClaimService.cs` — contrato do service
- `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestClaimService.cs` — orquestra claim (service layer)
- `backend-dotnet/src/RenoveJa.Api/Services/ClaimTimeoutBackgroundService.cs` — worker que libera claims stale
- `backend-dotnet/tests/RenoveJa.UnitTests/RequestClaimServiceTests.cs` — unit tests do service e domínio

**Modificar:**
- `backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs` — adicionar migration `RequestClaimMigrations`
- `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs` — `ClaimedAt`, `ClaimBy()`, `ReleaseClaim()`
- `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequestSnapshot.cs` — novo campo `ClaimedAt`
- `backend-dotnet/src/RenoveJa.Domain/Interfaces/IRequestRepository.cs` — `TryClaimAsync`, `ReleaseStaleClaimsAsync`
- `backend-dotnet/src/RenoveJa.Infrastructure/Repositories/RequestRepository.cs` — implementação SQL dos dois métodos + mapeamento `ClaimedAt`
- `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestEventsPublisher.cs` — `NotifyRequestClaimedAsync`, `NotifyRequestReleasedAsync`
- `backend-dotnet/src/RenoveJa.Api/Services/RequestEventsPublisher.cs` — implementação dos dois eventos
- `backend-dotnet/src/RenoveJa.Api/Controllers/RequestsController.cs` — endpoint `POST /{id}/claim`
- `backend-dotnet/src/RenoveJa.Api/Extensions/ServiceCollectionExtensions.cs` — DI do `IRequestClaimService`
- `backend-dotnet/src/RenoveJa.Api/Program.cs` — `AddHostedService<ClaimTimeoutBackgroundService>()`
- `backend-dotnet/tests/RenoveJa.UnitTests/AllEntityTests.cs` — testes de domínio `ClaimBy`/`ReleaseClaim`

### Frontend Mobile (React Native / Expo Router)

**Modificar:**
- `frontend-mobile/lib/api-requests.ts` — função `claimRequest(id)`
- `frontend-mobile/app/request-detail/[id].tsx` — modo read-only + botão "Iniciar revisão"
- `frontend-mobile/contexts/RequestsEventsContext.tsx` — listeners `RequestClaimed`/`RequestReleased`
- `frontend-mobile/app/(doctor)/review-queue.tsx` — remover do `queueSnapshot` ao receber `RequestClaimed`

### Frontend Web (React/Vite)

**Modificar:**
- `frontend-web/src/pages/doctor/DoctorRequestDetail.tsx` — modo read-only + botão
- `frontend-web/src/pages/doctor/DoctorRequests.tsx` (ou contexto SignalR correspondente) — listeners

---

## Execution order

Fase A (backend base) → Fase B (service+API+SignalR) → Fase C (worker) → Fase D (mobile) → Fase E (web) → Fase F (validação).

Cada tarefa termina com `dotnet build && dotnet test` verde (backend) ou `tsc --noEmit` verde (frontend) + commit.

---

# FASE A — Backend: Schema + Domínio + Repository

## Task 1: Migration para `claimed_at`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs`

- [ ] **Step 1: Ler estrutura atual do MigrationRunner**

Run: usar o Read tool em `MigrationRunner.cs` pra ver onde os arrays `private static readonly string[] XxxMigrations` são declarados e onde são chamados em sequência (método `RunAsync` ou similar).

- [ ] **Step 2: Adicionar array de migration**

Localizar o bloco onde estão os outros arrays de migration de `public.requests` (próximo a `RequestsAiMigrations`) e adicionar:

```csharp
private static readonly string[] RequestClaimMigrations =
{
    "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NULL",
    @"CREATE INDEX IF NOT EXISTS idx_requests_claimed_at
         ON public.requests (claimed_at)
       WHERE claimed_at IS NOT NULL AND doctor_id IS NOT NULL"
};
```

- [ ] **Step 3: Chamar a migration na sequência de execução**

No método que executa as migrations em ordem (procurar onde `RequestsAiMigrations` / `AiRejectionMigrations` são executadas), adicionar a chamada ao `RequestClaimMigrations` ao final:

```csharp
await RunMigrationArrayAsync(db, RequestClaimMigrations, "RequestClaim", logger, cancellationToken);
```

Use o mesmo padrão que as migrations existentes na função.

- [ ] **Step 4: Build e verificar que compila**

Run:
```bash
cd backend-dotnet && dotnet build
```
Expected: Build succeeded. 0 Error(s).

- [ ] **Step 5: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs
git commit -m "feat(claim): migration claimed_at + índice parcial"
```

---

## Task 2: Snapshot do domínio — `ClaimedAt`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequestSnapshot.cs`

- [ ] **Step 1: Ler o snapshot atual**

Use Read em `MedicalRequestSnapshot.cs` e identifique a ordem dos campos.

- [ ] **Step 2: Adicionar campo `ClaimedAt` ao record**

Adicionar `ClaimedAt` ao record (próximo a outros timestamps tipo `SignedAt`, `UpdatedAt`). Como é um record, a ordem importa — colocar junto dos outros campos opcionais de timestamp. Exemplo (adaptar aos nomes reais do record):

```csharp
// ... campos existentes ...
DateTime? SignedAt,
DateTime? ClaimedAt,  // NEW
// ... restante ...
```

- [ ] **Step 3: Build — deve quebrar nos usos do Snapshot**

Run:
```bash
cd backend-dotnet && dotnet build
```
Expected: FAIL em pontos que instanciam `MedicalRequestSnapshot` (provavelmente `RequestRepository.MapToDomain`). Anotar os arquivos/linhas pra corrigir na Task 3.

- [ ] **Step 4: Commit parcial**

Não commitar ainda — Task 3 completa a compilação. Continuar direto pra Task 3.

---

## Task 3: Domínio — propriedade `ClaimedAt` + métodos `ClaimBy`/`ReleaseClaim` (TDD)

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs`
- Test: `backend-dotnet/tests/RenoveJa.UnitTests/AllEntityTests.cs`

- [ ] **Step 1: Escrever teste `ClaimBy_ShouldSetDoctorAndClaimedAt`**

Adicionar no fim de `AllEntityTests.cs` (seguir o padrão dos testes `AssignDoctor_*` já existentes):

```csharp
[Fact]
public void ClaimBy_ShouldSetDoctorAndClaimedAtAndInReview()
{
    var r = MakePrescriptionRequest();
    var doctorId = Guid.NewGuid();
    var before = DateTime.UtcNow;

    r.ClaimBy(doctorId, "Dr. Ana");

    r.DoctorId.Should().Be(doctorId);
    r.DoctorName.Should().Be("Dr. Ana");
    r.Status.Should().Be(RequestStatus.InReview);
    r.ClaimedAt.Should().NotBeNull();
    r.ClaimedAt!.Value.Should().BeOnOrAfter(before);
}
```

Se o helper `MakePrescriptionRequest()` não existir, usar o padrão do teste `AssignDoctor_ShouldSetDoctorAndStatus` (linha ~892) como template.

- [ ] **Step 2: Escrever teste `ClaimBy_ShouldThrow_WhenAlreadyClaimed`**

```csharp
[Fact]
public void ClaimBy_ShouldThrow_WhenAlreadyClaimed()
{
    var r = MakePrescriptionRequest();
    r.ClaimBy(Guid.NewGuid(), "Dr. Primeiro");

    Action act = () => r.ClaimBy(Guid.NewGuid(), "Dr. Segundo");

    act.Should().Throw<DomainException>()
       .WithMessage("*já*pego*");
}
```

- [ ] **Step 3: Escrever teste `ReleaseClaim_ShouldRevertToSubmittedAndClearClaim`**

```csharp
[Fact]
public void ReleaseClaim_ShouldRevertToSubmittedAndClearClaim()
{
    var r = MakePrescriptionRequest();
    r.ClaimBy(Guid.NewGuid(), "Dr. Ana");

    r.ReleaseClaim();

    r.DoctorId.Should().BeNull();
    r.DoctorName.Should().BeNull();
    r.ClaimedAt.Should().BeNull();
    r.Status.Should().Be(RequestStatus.Submitted);
}
```

- [ ] **Step 4: Escrever teste `ReleaseClaim_ShouldThrow_WhenNotClaimed`**

```csharp
[Fact]
public void ReleaseClaim_ShouldThrow_WhenNotClaimed()
{
    var r = MakePrescriptionRequest();
    // sem claim prévio

    Action act = () => r.ReleaseClaim();

    act.Should().Throw<DomainException>();
}
```

- [ ] **Step 5: Rodar os 4 testes — devem falhar**

Run:
```bash
cd backend-dotnet && dotnet test --filter "FullyQualifiedName~ClaimBy|FullyQualifiedName~ReleaseClaim"
```
Expected: 4 testes falham (método `ClaimBy`/`ReleaseClaim` não existe).

- [ ] **Step 6: Adicionar propriedade `ClaimedAt` em `MedicalRequest.cs`**

Localizar onde estão as outras propriedades auto (DoctorId, DoctorName, SignedAt, etc.) e adicionar:

```csharp
public DateTime? ClaimedAt { get; private set; }
```

- [ ] **Step 7: Implementar método `ClaimBy`**

Adicionar próximo ao método `AssignDoctor` existente (linha ~484):

```csharp
/// <summary>
/// Claim explícito do pedido por um médico. Usado pelo fluxo "Iniciar revisão"
/// para travar o pedido antes da aprovação (first-come-first-serve).
///
/// Diferente de AssignDoctor, esse método rejeita se já existe um dono —
/// não faz sobrescrita silenciosa.
/// </summary>
public void ClaimBy(Guid doctorId, string doctorName)
{
    if (DoctorId.HasValue)
        throw new DomainException("Este pedido já foi pego por outro médico.");

    AssignDoctor(doctorId, doctorName); // seta DoctorId, DoctorName, Status=InReview
    ClaimedAt = DateTime.UtcNow;
}

/// <summary>
/// Libera o claim (revert para Submitted, sem médico). Usado pelo timeout
/// automático de 10 min do ClaimTimeoutBackgroundService.
/// </summary>
public void ReleaseClaim()
{
    if (!DoctorId.HasValue || !ClaimedAt.HasValue)
        throw new DomainException("Não há claim ativo para liberar.");

    DoctorId = null;
    DoctorName = null;
    ClaimedAt = null;
    Status = RequestStatus.Submitted;
    UpdatedAt = DateTime.UtcNow;
}
```

- [ ] **Step 8: Propagar `ClaimedAt` no overload `Reconstitute(snapshot)`**

Localizar o método `Reconstitute(MedicalRequestSnapshot snapshot)` (não o overload com 33 parâmetros) e adicionar, logo após a atribuição dos outros timestamps:

```csharp
request.ClaimedAt = snapshot.ClaimedAt;
```

- [ ] **Step 9: Rodar os testes — devem passar**

Run:
```bash
cd backend-dotnet && dotnet test --filter "FullyQualifiedName~ClaimBy|FullyQualifiedName~ReleaseClaim"
```
Expected: 4 passed.

- [ ] **Step 10: Build completo — pode quebrar no Repository**

Run:
```bash
cd backend-dotnet && dotnet build
```
Expected: **possível erro** em `RequestRepository.MapToDomain` (o lugar que constrói o `MedicalRequestSnapshot`) ou em `UpdateAsync` (que persiste). Anotar os erros pra Task 4.

- [ ] **Step 11: Commit parcial**

Só commitar se o build passar. Se ainda falhar no Repository, ir direto pra Task 4 e commitar juntos.

---

## Task 4: Repository — `TryClaimAsync` + `ReleaseStaleClaimsAsync` + mapeamento `claimed_at`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Domain/Interfaces/IRequestRepository.cs`
- Modify: `backend-dotnet/src/RenoveJa.Infrastructure/Repositories/RequestRepository.cs`

- [ ] **Step 1: Adicionar métodos à interface `IRequestRepository`**

Em `IRequestRepository.cs`, logo após `GetAvailableForQueueAsync`:

```csharp
/// <summary>
/// Tenta claim atômico de um pedido (UPDATE condicional em doctor_id IS NULL).
/// Retorna true se o pedido foi atribuído ao médico, false caso contrário
/// (já claimado, status inválido, ou não existe).
/// </summary>
Task<bool> TryClaimAsync(
    Guid requestId,
    Guid doctorId,
    string doctorName,
    CancellationToken cancellationToken = default);

/// <summary>
/// Libera todos os claims cujo claimed_at é mais antigo que o threshold.
/// Retorna os IDs dos pedidos liberados. Usado pelo background service
/// de timeout (10 min).
/// </summary>
Task<List<Guid>> ReleaseStaleClaimsAsync(
    TimeSpan threshold,
    CancellationToken cancellationToken = default);
```

- [ ] **Step 2: Atualizar `RequestModel` com `ClaimedAt`**

Localizar `RequestModel` (pode estar em `Repositories/RequestRepository.cs` ou em arquivo separado). Adicionar propriedade:

```csharp
public DateTime? ClaimedAt { get; set; }
```

- [ ] **Step 3: Atualizar `MapToDomain` para propagar `ClaimedAt`**

Na função `MapToDomain(RequestModel model)` dentro de `RequestRepository.cs`, localizar a construção do `MedicalRequestSnapshot` e adicionar `ClaimedAt` na posição correta do record:

```csharp
var snapshot = new MedicalRequestSnapshot(
    // ... campos existentes ...
    ClaimedAt: model.ClaimedAt,
    // ... restante ...
);
```

- [ ] **Step 4: Atualizar `UpdateAsync` para persistir `claimed_at`**

Localizar o método `UpdateAsync(MedicalRequest request, ...)` e o payload que é enviado ao Postgres (provavelmente um dicionário ou objeto anônimo). Adicionar:

```csharp
claimed_at = request.ClaimedAt,
```

E se houver colunas listadas explicitamente no UPDATE SQL, incluir `claimed_at`.

- [ ] **Step 5: Implementar `TryClaimAsync`**

Adicionar no fim de `RequestRepository.cs`:

```csharp
public async Task<bool> TryClaimAsync(
    Guid requestId,
    Guid doctorId,
    string doctorName,
    CancellationToken cancellationToken = default)
{
    const string sql = @"
UPDATE public.requests
   SET doctor_id   = @DoctorId,
       doctor_name = @DoctorName,
       status      = 'in_review',
       claimed_at  = NOW(),
       updated_at  = NOW()
 WHERE id = @RequestId
   AND doctor_id IS NULL
   AND status IN ('submitted','pending','analyzing','searching_doctor')
RETURNING id";

    await using var conn = db.CreateConnectionPublic();
    await conn.OpenAsync(cancellationToken);
    var result = await conn.QueryFirstOrDefaultAsync<Guid?>(
        new CommandDefinition(sql,
            new { RequestId = requestId, DoctorId = doctorId, DoctorName = doctorName },
            cancellationToken: cancellationToken));

    return result.HasValue;
}
```

- [ ] **Step 6: Implementar `ReleaseStaleClaimsAsync`**

```csharp
public async Task<List<Guid>> ReleaseStaleClaimsAsync(
    TimeSpan threshold,
    CancellationToken cancellationToken = default)
{
    // Interval dinâmico via parâmetro (safer que interpolar string na SQL).
    const string sql = @"
UPDATE public.requests
   SET doctor_id   = NULL,
       doctor_name = NULL,
       status      = 'submitted',
       claimed_at  = NULL,
       updated_at  = NOW()
 WHERE status = 'in_review'
   AND claimed_at IS NOT NULL
   AND claimed_at < NOW() - (@ThresholdSeconds || ' seconds')::interval
RETURNING id";

    await using var conn = db.CreateConnectionPublic();
    await conn.OpenAsync(cancellationToken);
    var ids = await conn.QueryAsync<Guid>(
        new CommandDefinition(sql,
            new { ThresholdSeconds = ((int)threshold.TotalSeconds).ToString() },
            cancellationToken: cancellationToken));

    return ids.ToList();
}
```

- [ ] **Step 7: Build — deve passar**

Run:
```bash
cd backend-dotnet && dotnet build
```
Expected: Build succeeded. 0 Error(s).

- [ ] **Step 8: Rodar todos os testes — existentes não podem quebrar**

Run:
```bash
cd backend-dotnet && dotnet test
```
Expected: All tests passed (novos de ClaimBy/ReleaseClaim + todos os antigos).

- [ ] **Step 9: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs \
        backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequestSnapshot.cs \
        backend-dotnet/src/RenoveJa.Domain/Interfaces/IRequestRepository.cs \
        backend-dotnet/src/RenoveJa.Infrastructure/Repositories/RequestRepository.cs \
        backend-dotnet/tests/RenoveJa.UnitTests/AllEntityTests.cs
git commit -m "feat(claim): domínio ClaimBy/ReleaseClaim + repo TryClaim atômico"
```

---

# FASE B — Backend: Service + API + SignalR

## Task 5: SignalR events `RequestClaimed` e `RequestReleased`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestEventsPublisher.cs`
- Modify: `backend-dotnet/src/RenoveJa.Api/Services/RequestEventsPublisher.cs`

> **Ordem:** Task 5 precede o service (Task 6) pra que o service possa mockar `NotifyRequestClaimedAsync` nos testes sem erro de compilação.

- [ ] **Step 1: Adicionar métodos à interface**

Ao fim de `IRequestEventsPublisher.cs`:

```csharp
/// <summary>
/// Notifica todos os médicos conectados que um pedido foi claimado.
/// Clientes devem remover o card da fila local.
/// Evento emitido: "RequestClaimed".
/// </summary>
Task NotifyRequestClaimedAsync(
    Guid requestId,
    string claimedByDoctorName,
    CancellationToken cancellationToken = default);

/// <summary>
/// Notifica todos os médicos que um pedido foi liberado (timeout ou release manual)
/// e voltou pra fila global. Clientes devem adicionar o card de volta.
/// Evento emitido: "RequestReleased".
/// </summary>
Task NotifyRequestReleasedAsync(
    Guid requestId,
    CancellationToken cancellationToken = default);
```

- [ ] **Step 2: Implementar em `RequestEventsPublisher.cs`**

Adicionar ao fim da classe:

```csharp
public const string RequestClaimedEvent = "RequestClaimed";
public const string RequestReleasedEvent = "RequestReleased";

public async Task NotifyRequestClaimedAsync(
    Guid requestId,
    string claimedByDoctorName,
    CancellationToken cancellationToken = default)
{
    try
    {
        var payload = new
        {
            requestId = requestId.ToString(),
            claimedByDoctorName,
            claimedAt = DateTime.UtcNow
        };

        await hubContext.Clients
            .Group(RequestsHub.DoctorsGroupName)
            .SendAsync(RequestClaimedEvent, payload, cancellationToken);

        logger.LogDebug(
            "RequestEvents: sent {Event} for request {RequestId} by {Doctor}",
            RequestClaimedEvent, requestId, claimedByDoctorName);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex,
            "RequestEvents: failed to send RequestClaimed for {RequestId}", requestId);
    }
}

public async Task NotifyRequestReleasedAsync(
    Guid requestId,
    CancellationToken cancellationToken = default)
{
    try
    {
        var payload = new { requestId = requestId.ToString() };

        await hubContext.Clients
            .Group(RequestsHub.DoctorsGroupName)
            .SendAsync(RequestReleasedEvent, payload, cancellationToken);

        logger.LogDebug(
            "RequestEvents: sent {Event} for request {RequestId}",
            RequestReleasedEvent, requestId);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex,
            "RequestEvents: failed to send RequestReleased for {RequestId}", requestId);
    }
}
```

- [ ] **Step 3: Build e testar**

Run:
```bash
cd backend-dotnet && dotnet build && dotnet test
```
Expected: Build succeeded. All tests passed.

- [ ] **Step 4: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestEventsPublisher.cs \
        backend-dotnet/src/RenoveJa.Api/Services/RequestEventsPublisher.cs
git commit -m "feat(claim): eventos SignalR RequestClaimed/RequestReleased"
```

---

## Task 6: `IRequestClaimService` + `RequestClaimService` (TDD)

**Files:**
- Create: `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestClaimService.cs`
- Create: `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestClaimService.cs`
- Create: `backend-dotnet/tests/RenoveJa.UnitTests/RequestClaimServiceTests.cs`

- [ ] **Step 1: Criar arquivo de interface**

```csharp
// backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestClaimService.cs
using RenoveJa.Domain.Entities;

namespace RenoveJa.Application.Interfaces;

public enum ClaimOutcome { Success, Conflict, NotFound, InvalidState }

public sealed record ClaimResult(
    ClaimOutcome Outcome,
    MedicalRequest? Request,
    string? CurrentHolderName,
    string? ErrorMessage)
{
    public static ClaimResult Ok(MedicalRequest r) => new(ClaimOutcome.Success, r, null, null);
    public static ClaimResult Conflict(string holder) => new(ClaimOutcome.Conflict, null, holder, null);
    public static ClaimResult NotFound() => new(ClaimOutcome.NotFound, null, null, "Pedido não encontrado");
    public static ClaimResult Invalid(string msg) => new(ClaimOutcome.InvalidState, null, null, msg);
}

public interface IRequestClaimService
{
    Task<ClaimResult> ClaimAsync(Guid requestId, Guid doctorId, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Criar teste `ClaimAsync_ShouldReturnSuccess_WhenRepoReturnsTrue`**

```csharp
// backend-dotnet/tests/RenoveJa.UnitTests/RequestClaimServiceTests.cs
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services.Requests;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;
using Xunit;

namespace RenoveJa.UnitTests;

public class RequestClaimServiceTests
{
    private readonly Mock<IRequestRepository> _repo = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IRequestEventsPublisher> _events = new();
    private readonly RequestClaimService _sut;

    public RequestClaimServiceTests()
    {
        _sut = new RequestClaimService(
            _repo.Object,
            _users.Object,
            _events.Object,
            NullLogger<RequestClaimService>.Instance);
    }

    [Fact]
    public async Task ClaimAsync_ShouldReturnSuccess_WhenRepoReturnsTrue()
    {
        var requestId = Guid.NewGuid();
        var doctorId = Guid.NewGuid();
        var doctor = User.Create("doctor@test", "hash", "Dr. Ana", UserRole.Doctor);
        var request = TestHelpers.MakePrescriptionRequest();
        request.GetType().GetProperty("Id")!.SetValue(request, requestId);

        _users.Setup(u => u.GetByIdAsync(doctorId, It.IsAny<CancellationToken>()))
              .ReturnsAsync(doctor);
        _repo.Setup(r => r.TryClaimAsync(requestId, doctorId, "Dr. Ana", It.IsAny<CancellationToken>()))
             .ReturnsAsync(true);
        _repo.Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(request);

        var result = await _sut.ClaimAsync(requestId, doctorId);

        result.Outcome.Should().Be(ClaimOutcome.Success);
        result.Request.Should().NotBeNull();
        _events.Verify(e => e.NotifyRequestClaimedAsync(
            requestId, "Dr. Ana", It.IsAny<CancellationToken>()), Times.Once);
    }
}
```

**NOTA**: `TestHelpers.MakePrescriptionRequest()` pode não existir. Se não existir, criar inline no teste usando o padrão dos testes existentes em `ComplementaryTests.cs` ou `AllEntityTests.cs`. Ajustar também o construtor de `User` pra match com a assinatura real — se a assinatura for diferente, use reflection ou o factory real do projeto.

- [ ] **Step 3: Criar teste `ClaimAsync_ShouldReturnConflict_WhenRepoReturnsFalse`**

```csharp
[Fact]
public async Task ClaimAsync_ShouldReturnConflict_WhenRepoReturnsFalse()
{
    var requestId = Guid.NewGuid();
    var doctorId = Guid.NewGuid();
    var doctor = User.Create("doctor@test", "hash", "Dr. Ana", UserRole.Doctor);
    var existing = TestHelpers.MakePrescriptionRequest();
    existing.AssignDoctor(Guid.NewGuid(), "Dr. Carlos");

    _users.Setup(u => u.GetByIdAsync(doctorId, It.IsAny<CancellationToken>()))
          .ReturnsAsync(doctor);
    _repo.Setup(r => r.TryClaimAsync(requestId, doctorId, "Dr. Ana", It.IsAny<CancellationToken>()))
         .ReturnsAsync(false);
    _repo.Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
         .ReturnsAsync(existing);

    var result = await _sut.ClaimAsync(requestId, doctorId);

    result.Outcome.Should().Be(ClaimOutcome.Conflict);
    result.CurrentHolderName.Should().Be("Dr. Carlos");
    _events.Verify(e => e.NotifyRequestClaimedAsync(
        It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
}
```

- [ ] **Step 4: Criar teste `ClaimAsync_ShouldReturnNotFound_WhenRequestMissing`**

```csharp
[Fact]
public async Task ClaimAsync_ShouldReturnNotFound_WhenRequestMissing()
{
    var requestId = Guid.NewGuid();
    var doctorId = Guid.NewGuid();
    var doctor = User.Create("doctor@test", "hash", "Dr. Ana", UserRole.Doctor);

    _users.Setup(u => u.GetByIdAsync(doctorId, It.IsAny<CancellationToken>()))
          .ReturnsAsync(doctor);
    _repo.Setup(r => r.TryClaimAsync(requestId, doctorId, "Dr. Ana", It.IsAny<CancellationToken>()))
         .ReturnsAsync(false);
    _repo.Setup(r => r.GetByIdAsync(requestId, It.IsAny<CancellationToken>()))
         .ReturnsAsync((MedicalRequest?)null);

    var result = await _sut.ClaimAsync(requestId, doctorId);

    result.Outcome.Should().Be(ClaimOutcome.NotFound);
}
```

- [ ] **Step 5: Rodar os testes — devem falhar (classe não existe)**

Run:
```bash
cd backend-dotnet && dotnet test --filter "FullyQualifiedName~RequestClaimServiceTests"
```
Expected: compilation errors (`RequestClaimService` não existe).

- [ ] **Step 6: Implementar `RequestClaimService`**

```csharp
// backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestClaimService.cs
using Microsoft.Extensions.Logging;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Application.Services.Requests;

public class RequestClaimService(
    IRequestRepository requestRepository,
    IUserRepository userRepository,
    IRequestEventsPublisher eventsPublisher,
    ILogger<RequestClaimService> logger) : IRequestClaimService
{
    public async Task<ClaimResult> ClaimAsync(
        Guid requestId,
        Guid doctorId,
        CancellationToken cancellationToken = default)
    {
        var doctor = await userRepository.GetByIdAsync(doctorId, cancellationToken);
        if (doctor == null || !doctor.IsDoctor())
            return ClaimResult.Invalid("Usuário não é médico.");

        var claimed = await requestRepository.TryClaimAsync(
            requestId, doctorId, doctor.Name, cancellationToken);

        if (!claimed)
        {
            // Descobrir motivo: não existe vs. já foi pego
            var existing = await requestRepository.GetByIdAsync(requestId, cancellationToken);
            if (existing == null)
                return ClaimResult.NotFound();

            var holder = existing.DoctorName ?? "outro médico";
            logger.LogInformation(
                "Claim conflict: requestId={RequestId} doctor={DoctorId} holder={Holder}",
                requestId, doctorId, holder);
            return ClaimResult.Conflict(holder);
        }

        // Sucesso — recarrega o pedido atualizado e publica evento
        var updated = await requestRepository.GetByIdAsync(requestId, cancellationToken);
        if (updated == null)
            return ClaimResult.Invalid("Pedido desapareceu após claim.");

        try
        {
            await eventsPublisher.NotifyRequestClaimedAsync(
                requestId, doctor.Name, cancellationToken);
        }
        catch (Exception ex)
        {
            // Falha no SignalR não deve reverter o claim — o polling fallback pega
            logger.LogWarning(ex,
                "Claim SignalR publish failed: requestId={RequestId}", requestId);
        }

        logger.LogInformation(
            "Claim success: requestId={RequestId} doctor={DoctorId}",
            requestId, doctorId);

        return ClaimResult.Ok(updated);
    }
}
```

- [ ] **Step 7: Rodar testes — devem passar**

Run:
```bash
cd backend-dotnet && dotnet test --filter "FullyQualifiedName~RequestClaimServiceTests"
```
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestClaimService.cs \
        backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestClaimService.cs \
        backend-dotnet/tests/RenoveJa.UnitTests/RequestClaimServiceTests.cs
git commit -m "feat(claim): RequestClaimService com outcomes Success/Conflict/NotFound"
```

---

## Task 7: Endpoint `POST /api/requests/{id}/claim`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Api/Controllers/RequestsController.cs`
- Modify: `backend-dotnet/src/RenoveJa.Api/Extensions/ServiceCollectionExtensions.cs`

- [ ] **Step 1: Registrar `IRequestClaimService` no DI**

Em `ServiceCollectionExtensions.cs`, método `AddApplicationServices()`, próximo aos outros `AddScoped`:

```csharp
services.AddScoped<IRequestClaimService, RequestClaimService>();
```

- [ ] **Step 2: Injetar no controller**

Modificar o construtor de `RequestsController` (linha ~22-27) adicionando `IRequestClaimService claimService`:

```csharp
public class RequestsController(
    IRequestService requestService,
    IStorageService storageService,
    IAuditEventService auditEventService,
    IRequestRepository requestRepository,
    IRequestClaimService claimService,  // NEW
    ILogger<RequestsController> logger) : ControllerBase
```

- [ ] **Step 3: Adicionar endpoint Claim**

Ao fim de `RequestsController.cs` (antes do `}` final da classe):

```csharp
// ── Claim endpoint ────────────────────────────────────────────

/// <summary>
/// Claim explícito de um pedido ("Iniciar revisão"). Trava o pedido pro médico
/// atual usando UPDATE atômico (first-come-first-serve). Retorna 409 se outro
/// médico já pegou. Timeout automático de 10 min libera pedidos abandonados.
/// </summary>
[HttpPost("{id}/claim")]
[Authorize(Roles = "doctor")]
public async Task<IActionResult> Claim(string id, CancellationToken cancellationToken)
{
    var resolvedId = await ResolveRequestIdAsync(id, cancellationToken);
    if (resolvedId == null)
        return NotFound(new { error = "Pedido não encontrado." });

    var doctorId = GetUserId();
    var result = await claimService.ClaimAsync(resolvedId.Value, doctorId, cancellationToken);

    return result.Outcome switch
    {
        ClaimOutcome.Success => Ok(new { request = result.Request }),
        ClaimOutcome.Conflict => Conflict(new
        {
            error = $"Outro médico ({result.CurrentHolderName}) já pegou este pedido.",
            claimedBy = result.CurrentHolderName
        }),
        ClaimOutcome.NotFound => NotFound(new { error = "Pedido não encontrado." }),
        _ => BadRequest(new { error = result.ErrorMessage ?? "Não foi possível pegar o pedido." })
    };
}
```

**Nota:** adicionar `using RenoveJa.Application.Interfaces;` no topo do arquivo se ainda não estiver.

**Importante:** o endpoint retorna o `MedicalRequest` domínio diretamente. Se o padrão do projeto for mapear para DTO, seguir esse padrão (ver como `RequestApprovalController.Approve` retorna o resultado — provavelmente mapeando para `RequestResponseDto`). Se for o caso, injetar também `IRequestQueryService` ou usar um helper de mapeamento existente.

- [ ] **Step 4: Build**

Run:
```bash
cd backend-dotnet && dotnet build
```
Expected: Build succeeded.

- [ ] **Step 5: Smoke test manual com curl (ou postponer para Task 14)**

Skip por enquanto — vamos validar end-to-end depois do frontend.

- [ ] **Step 6: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Api/Controllers/RequestsController.cs \
        backend-dotnet/src/RenoveJa.Api/Extensions/ServiceCollectionExtensions.cs
git commit -m "feat(claim): endpoint POST /api/requests/{id}/claim"
```

---

# FASE C — Backend: Timeout worker

## Task 8: `ClaimTimeoutBackgroundService`

**Files:**
- Create: `backend-dotnet/src/RenoveJa.Api/Services/ClaimTimeoutBackgroundService.cs`
- Modify: `backend-dotnet/src/RenoveJa.Api/Program.cs`

- [ ] **Step 1: Criar o background service**

```csharp
// backend-dotnet/src/RenoveJa.Api/Services/ClaimTimeoutBackgroundService.cs
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Api.Services;

/// <summary>
/// Background service que libera claims "stale" — pedidos que um médico pegou
/// mas não finalizou dentro do timeout de 10 minutos. O pedido volta pra fila
/// global e qualquer médico pode pegar novamente.
///
/// Roda a cada 1 minuto. O UPDATE no Postgres é idempotente (WHERE claimed_at < NOW() - interval),
/// então mesmo em multi-instância não há corrupção — apenas eventos SignalR duplicados
/// (ver dívida técnica alinhada com batch sign).
/// </summary>
public sealed class ClaimTimeoutBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<ClaimTimeoutBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan ClaimTimeout = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan SweepInterval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "ClaimTimeoutBackgroundService started. Timeout={Timeout}, Sweep={Sweep}",
            ClaimTimeout, SweepInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<IRequestRepository>();
                var publisher = scope.ServiceProvider.GetRequiredService<IRequestEventsPublisher>();

                var released = await repo.ReleaseStaleClaimsAsync(ClaimTimeout, stoppingToken);

                if (released.Count > 0)
                {
                    logger.LogInformation(
                        "ClaimTimeoutBackgroundService released {Count} stale claim(s): {Ids}",
                        released.Count, string.Join(", ", released));

                    foreach (var id in released)
                    {
                        try
                        {
                            await publisher.NotifyRequestReleasedAsync(id, stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            logger.LogWarning(ex,
                                "Failed to publish RequestReleased for {RequestId}", id);
                        }
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // graceful shutdown
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "ClaimTimeoutBackgroundService sweep failed");
            }

            try
            {
                await Task.Delay(SweepInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        logger.LogInformation("ClaimTimeoutBackgroundService stopped.");
    }
}
```

- [ ] **Step 2: Registrar em `Program.cs`**

Localizar a seção de `AddHostedService` (linha ~203-207) e adicionar:

```csharp
builder.Services.AddHostedService<ClaimTimeoutBackgroundService>();
```

Próximo ao `AddHostedService<AuditBackgroundService>()` ou onde os outros workers estão registrados.

- [ ] **Step 3: Build**

Run:
```bash
cd backend-dotnet && dotnet build
```
Expected: Build succeeded.

- [ ] **Step 4: Rodar testes gerais — nada pode ter quebrado**

Run:
```bash
cd backend-dotnet && dotnet test
```
Expected: All tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Api/Services/ClaimTimeoutBackgroundService.cs \
        backend-dotnet/src/RenoveJa.Api/Program.cs
git commit -m "feat(claim): ClaimTimeoutBackgroundService libera stale claims (10min)"
```

---

# FASE D — Frontend Mobile

## Task 9: Função `claimRequest` no api-requests.ts

**Files:**
- Modify: `frontend-mobile/lib/api-requests.ts`

- [ ] **Step 1: Ler o arquivo pra entender padrão**

Use Read em `frontend-mobile/lib/api-requests.ts` pra ver como as outras funções (ex: `rejectRequest`, `approveRequest`) estão estruturadas — com qual helper fazem POST, como tratam erros, tipos de retorno.

- [ ] **Step 2: Adicionar função `claimRequest`**

Adicionar ao fim do arquivo (adaptar ao padrão exato observado no Step 1):

```typescript
import type { RequestResponseDto } from '../types/database';

/**
 * Faz claim explícito de um pedido ("Iniciar revisão").
 * Retorna o pedido atualizado em caso de sucesso.
 * Lança erro com status 409 se outro médico já pegou — o body do erro
 * contém `claimedBy` com o nome do médico atual.
 */
export async function claimRequest(id: string): Promise<{ request: RequestResponseDto }> {
  return apiPost<{ request: RequestResponseDto }>(`/api/requests/${id}/claim`, {});
}
```

**Nota:** `apiPost` é placeholder — usar o helper real do projeto (pode ser `api.post`, `authenticatedPost`, `postJson`, etc. — conferir no Step 1).

- [ ] **Step 3: Verificar tipos**

Run:
```bash
cd frontend-mobile && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend-mobile/lib/api-requests.ts
git commit -m "feat(claim-mobile): adiciona claimRequest(id) no api layer"
```

---

## Task 10: Modo read-only em `request-detail/[id].tsx` + botão "Iniciar revisão"

**Files:**
- Modify: `frontend-mobile/app/request-detail/[id].tsx`

- [ ] **Step 1: Ler o arquivo atual**

Use Read em `frontend-mobile/app/request-detail/[id].tsx` e mapear:
- Como o `request` é carregado (provavelmente via `useQuery`)
- Onde ficam os botões de ação (aprovar, rejeitar, editar conduta)
- Como identifica se o usuário é médico vs. paciente
- Hook de current user (ex: `useAuth`, `useCurrentUser`)

- [ ] **Step 2: Criar helper `isUnclaimedForDoctor`**

No topo do arquivo, após os imports:

```typescript
/** True quando o pedido está disponível na fila global (sem médico dono). */
function isUnclaimedForDoctor(request: RequestResponseDto, userRole: string): boolean {
  return userRole === 'doctor' && !request.doctorId;
}
```

- [ ] **Step 3: Adicionar estado `isClaiming` e handler**

Dentro do componente, após os hooks existentes:

```typescript
const [isClaiming, setIsClaiming] = useState(false);
const queryClient = useQueryClient();

async function handleClaim() {
  if (!request || isClaiming) return;
  setIsClaiming(true);
  try {
    await claimRequest(request.id);
    await queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
    showToast('Pedido pego com sucesso.', 'success');
    // navegar para o editor normal
    router.replace(`/doctor-request/editor/${request.id}`);
  } catch (err: any) {
    if (err?.status === 409) {
      const holder = err?.body?.claimedBy ?? 'outro médico';
      showToast(`${holder} já pegou este pedido.`, 'info');
      await queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
      router.back();
    } else {
      showToast(humanizeError(err), 'error');
    }
  } finally {
    setIsClaiming(false);
  }
}
```

**Imports necessários** (adicionar no topo se ainda não estiverem):

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { claimRequest } from '../../lib/api-requests';
import { DOCTOR_REQUESTS_QUERY_KEY } from '../../lib/hooks/useDoctorRequestsQuery';
import { showToast } from '../../components/ui/Toast';
import { humanizeError } from '../../lib/errors/humanizeError';
```

- [ ] **Step 4: Adicionar conditional rendering — banner + botão**

Logo antes do footer/botões existentes, envolver em condicional:

```tsx
{request && currentUser && isUnclaimedForDoctor(request, currentUser.role) ? (
  <View style={styles.claimContainer}>
    <View style={styles.claimBanner}>
      <Ionicons name="information-circle" size={20} color="#0ea5e9" />
      <Text style={styles.claimBannerText}>
        Este pedido está disponível na fila. Clique em Iniciar revisão para atendê-lo.
      </Text>
    </View>
    <TouchableOpacity
      style={[styles.claimButton, isClaiming && styles.claimButtonDisabled]}
      onPress={handleClaim}
      disabled={isClaiming}
    >
      {isClaiming ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.claimButtonText}>Iniciar revisão</Text>
      )}
    </TouchableOpacity>
  </View>
) : (
  <>{/* botões originais de aprovar/rejeitar/editar */}</>
)}
```

- [ ] **Step 5: Adicionar estilos**

No `StyleSheet.create({ ... })` existente:

```typescript
claimContainer: {
  padding: 16,
  gap: 12,
  borderTopWidth: 1,
  borderTopColor: '#e5e7eb',
  backgroundColor: '#fff',
},
claimBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  padding: 12,
  backgroundColor: '#f0f9ff',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#bae6fd',
},
claimBannerText: {
  flex: 1,
  fontSize: 13,
  color: '#075985',
  lineHeight: 18,
},
claimButton: {
  height: 52,
  backgroundColor: '#0ea5e9',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
claimButtonDisabled: {
  opacity: 0.6,
},
claimButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
```

- [ ] **Step 6: Verificar tipos e lint**

Run:
```bash
cd frontend-mobile && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add frontend-mobile/app/request-detail/[id].tsx
git commit -m "feat(claim-mobile): detalhe read-only + botão Iniciar revisão"
```

---

## Task 11: Listeners SignalR `RequestClaimed`/`RequestReleased` no `RequestsEventsContext`

**Files:**
- Modify: `frontend-mobile/contexts/RequestsEventsContext.tsx`

- [ ] **Step 1: Ler o contexto atual**

Use Read em `frontend-mobile/contexts/RequestsEventsContext.tsx` pra ver:
- Como a conexão SignalR é criada (`HubConnectionBuilder`)
- Como os listeners atuais são registrados (`connection.on('EventName', handler)`)
- Como o `queryClient` é acessado dentro do contexto

- [ ] **Step 2: Adicionar listener `RequestClaimed`**

No bloco onde os outros eventos são registrados (próximo a `RequestUpdated`, `BatchSignCompleted`):

```typescript
connection.on('RequestClaimed', (payload: { requestId: string; claimedByDoctorName: string; claimedAt: string }) => {
  console.log('[SignalR] RequestClaimed', payload);
  // Invalida a lista de pedidos — cards que o outro médico pegou somem
  queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
});
```

- [ ] **Step 3: Adicionar listener `RequestReleased`**

```typescript
connection.on('RequestReleased', (payload: { requestId: string }) => {
  console.log('[SignalR] RequestReleased', payload);
  // Pedido voltou pra fila — invalida pra card reaparecer
  queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
});
```

- [ ] **Step 4: Imports**

Garantir que `DOCTOR_REQUESTS_QUERY_KEY` está importado no arquivo:

```typescript
import { DOCTOR_REQUESTS_QUERY_KEY } from '../lib/hooks/useDoctorRequestsQuery';
```

- [ ] **Step 5: Verificar tipos**

Run:
```bash
cd frontend-mobile && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend-mobile/contexts/RequestsEventsContext.tsx
git commit -m "feat(claim-mobile): listeners SignalR RequestClaimed/Released"
```

---

## Task 12: Modo Foco — remover claimed do `queueSnapshot`

**Files:**
- Modify: `frontend-mobile/app/(doctor)/review-queue.tsx`

- [ ] **Step 1: Re-ler o arquivo (já foi lido na brainstorming)**

Relembrar a estrutura do `queueSnapshot` (linha 122-139 do spec): array congelado no momento da abertura do modo foco, que itera sequencialmente.

- [ ] **Step 2: Adicionar effect que escuta o evento SignalR**

Dentro do componente `ReviewQueueScreen`, após os hooks existentes de estado:

```typescript
// Remove from the frozen queueSnapshot when another doctor claims a pending
// request before we get to it. Avoids sending the doctor into a 409 at approve time.
useEffect(() => {
  if (!queueSnapshot) return;

  // Hook into the same SignalR connection via queryClient's mutations.
  // Strategy: watch the react-query cache for invalidation and filter out
  // requests that are no longer in the fresh list AND have doctorId set.
  // Simpler alternative: rely on the RequestsEventsContext dispatching a
  // custom event we can subscribe to — see Step 3.
}, [queueSnapshot]);
```

**Estratégia real** (simpler): em vez de duplicar listener, expor um helper no `RequestsEventsContext` que componentes podem usar pra reagir a `RequestClaimed`. Passa direto pro Step 3.

- [ ] **Step 3: Expor um hook `useOnRequestClaimed` no contexto**

Modificar `RequestsEventsContext.tsx` (adicional à Task 11) pra expor um callback registry:

```typescript
// dentro do contexto, além dos listeners da Task 11
const claimedListeners = useRef<Set<(requestId: string) => void>>(new Set());

// no listener RequestClaimed da Task 11, ADICIONAR:
connection.on('RequestClaimed', (payload: { requestId: string; ... }) => {
  queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
  claimedListeners.current.forEach(fn => fn(payload.requestId));  // NEW
});

// no value do provider, expor:
const contextValue = {
  ...existing,
  subscribeToClaimed: (fn: (requestId: string) => void) => {
    claimedListeners.current.add(fn);
    return () => { claimedListeners.current.delete(fn); };
  },
};
```

E exportar o hook:

```typescript
export function useOnRequestClaimed(handler: (requestId: string) => void) {
  const ctx = useContext(RequestsEventsContext);
  useEffect(() => {
    if (!ctx?.subscribeToClaimed) return;
    return ctx.subscribeToClaimed(handler);
  }, [ctx, handler]);
}
```

- [ ] **Step 4: Usar o hook no `review-queue.tsx`**

```typescript
import { useOnRequestClaimed } from '../../contexts/RequestsEventsContext';

// dentro do componente:
useOnRequestClaimed((claimedRequestId) => {
  setQueueSnapshot((prev) => {
    if (!prev) return prev;
    const idx = prev.findIndex(r => r.id === claimedRequestId);
    if (idx === -1) return prev;  // já processado ou não estava na fila
    if (idx < currentIndex) return prev;  // já passamos por este

    // Mostrar feedback leve
    showToast('Outro médico pegou um pedido da sua fila.', 'info');
    return prev.filter(r => r.id !== claimedRequestId);
  });
});
```

- [ ] **Step 5: Verificar tipos**

Run:
```bash
cd frontend-mobile && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend-mobile/contexts/RequestsEventsContext.tsx \
        frontend-mobile/app/\(doctor\)/review-queue.tsx
git commit -m "feat(claim-mobile): modo foco remove pedido do snapshot ao ver RequestClaimed"
```

---

# FASE E — Frontend Web

## Task 13: `DoctorRequestDetail.tsx` read-only + botão Iniciar revisão

**Files:**
- Modify: `frontend-web/src/pages/doctor/DoctorRequestDetail.tsx`
- Modify: `frontend-web/src/lib/api.ts` (ou equivalente — função `claimRequest`)

- [ ] **Step 1: Ler arquivos atuais**

Use Read em:
- `frontend-web/src/pages/doctor/DoctorRequestDetail.tsx`
- `frontend-web/src/lib/api.ts` (ou o arquivo que tem funções tipo `approveRequest`, `rejectRequest`)

Mapear:
- Como é o padrão de api call (`fetch`, `axios`, helper custom)
- Como funcionam os botões de ação atuais
- Como detectar role=doctor

- [ ] **Step 2: Adicionar `claimRequest` no api layer do web**

Adaptar ao padrão observado. Exemplo com fetch:

```typescript
// frontend-web/src/lib/api.ts
export async function claimRequest(id: string): Promise<{ request: RequestResponseDto }> {
  const res = await authenticatedFetch(`/api/requests/${id}/claim`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? 'Claim falhou'), { status: res.status, body });
  }
  return res.json();
}
```

- [ ] **Step 3: Adicionar estado + handler no DoctorRequestDetail**

Espelhar a lógica do mobile (Task 10): `isClaiming`, `handleClaim`, toast em 409, navegação.

```typescript
const [isClaiming, setIsClaiming] = useState(false);
const navigate = useNavigate();
const queryClient = useQueryClient();

async function handleClaim() {
  if (!request || isClaiming) return;
  setIsClaiming(true);
  try {
    await claimRequest(request.id);
    await queryClient.invalidateQueries({ queryKey: ['doctor-requests'] });
    toast.success('Pedido pego com sucesso.');
    // refetch do detalhe pra entrar em modo editável
    await queryClient.invalidateQueries({ queryKey: ['request', request.id] });
  } catch (err: any) {
    if (err?.status === 409) {
      toast.info(`${err.body?.claimedBy ?? 'Outro médico'} já pegou este pedido.`);
      await queryClient.invalidateQueries({ queryKey: ['doctor-requests'] });
      navigate('/doctor/requests');
    } else {
      toast.error(err?.message ?? 'Erro ao pegar pedido.');
    }
  } finally {
    setIsClaiming(false);
  }
}
```

- [ ] **Step 4: Conditional rendering — banner + botão**

```tsx
{request && !request.doctorId && currentUser?.role === 'doctor' ? (
  <div className="border-t border-gray-200 p-4 space-y-3">
    <div className="flex items-center gap-2 p-3 bg-sky-50 border border-sky-200 rounded-lg">
      <InfoIcon className="w-5 h-5 text-sky-500" />
      <p className="text-sm text-sky-900">
        Este pedido está disponível na fila. Clique em Iniciar revisão para atendê-lo.
      </p>
    </div>
    <button
      type="button"
      onClick={handleClaim}
      disabled={isClaiming}
      className="w-full h-12 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold rounded-xl transition"
    >
      {isClaiming ? 'Carregando...' : 'Iniciar revisão'}
    </button>
  </div>
) : (
  <>{/* botões originais de aprovar/rejeitar */}</>
)}
```

- [ ] **Step 5: Lint + type-check**

Run:
```bash
cd frontend-web && npm run lint && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend-web/src/pages/doctor/DoctorRequestDetail.tsx frontend-web/src/lib/api.ts
git commit -m "feat(claim-web): detail read-only + botão Iniciar revisão"
```

---

## Task 14: Listeners SignalR no frontend web

**Files:**
- Modify: `frontend-web/src/pages/doctor/DoctorRequests.tsx` (ou o provider SignalR existente — procurar por `HubConnectionBuilder` no projeto web)

- [ ] **Step 1: Localizar provider SignalR atual**

Run:
```bash
grep -r "HubConnectionBuilder" frontend-web/src --include="*.ts" --include="*.tsx"
```

(use Grep tool)

- [ ] **Step 2: Adicionar listeners nos mesmos lugares que `RequestUpdated` é registrado**

```typescript
connection.on('RequestClaimed', (payload: { requestId: string; claimedByDoctorName: string }) => {
  queryClient.invalidateQueries({ queryKey: ['doctor-requests'] });
});

connection.on('RequestReleased', (payload: { requestId: string }) => {
  queryClient.invalidateQueries({ queryKey: ['doctor-requests'] });
});
```

- [ ] **Step 3: Build + type-check**

Run:
```bash
cd frontend-web && npx tsc --noEmit && npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend-web/src/
git commit -m "feat(claim-web): listeners SignalR RequestClaimed/Released"
```

---

# FASE F — Validação end-to-end

## Task 15: Build geral + testes + smoke test manual

- [ ] **Step 1: Full backend build + tests**

Run:
```bash
cd backend-dotnet && dotnet build && dotnet test
```
Expected: All passed.

- [ ] **Step 2: Full mobile type-check**

Run:
```bash
cd frontend-mobile && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Full web type-check + build**

Run:
```bash
cd frontend-web && npx tsc --noEmit && npm run build
```
Expected: No errors.

- [ ] **Step 4: Smoke test manual — 2 médicos claim concorrente**

Pré-requisito: ambiente dev rodando (backend na porta 5000, 2 devices ou 2 contas logadas no app mobile).

Passos:
1. Criar 1 solicitação de receita como paciente.
2. Device A (médico 1): ver o card na fila; abrir detalhe → confirmar modo read-only + banner + botão "Iniciar revisão".
3. Device B (médico 2): ver o MESMO card na fila.
4. Device A: clicar "Iniciar revisão" → deve navegar pro editor normal.
5. Device B: card some da fila em < 2s (SignalR).
6. Device B: tentar abrir pelo short_code direto → deve ver `409` e toast *"Dr. X já pegou este pedido."*.
7. Device A: fechar o app sem aprovar.
8. Aguardar **11 minutos**.
9. Device B: verificar que o card reapareceu na fila (timeout).
10. Device A: reabrir o app → o card NÃO está mais atribuído a ele; se tentar editar, recebe 409.

- [ ] **Step 5: Smoke test corrida — 2 claims simultâneos**

Com dois devices abertos no detalhe do mesmo pedido em modo read-only:
1. Contar "1, 2, 3, clica" — ambos clicam "Iniciar revisão" quase ao mesmo tempo.
2. Exatamente 1 deve entrar no editor.
3. O outro deve ver 409 + toast *"Dr. X já pegou este pedido."*.

- [ ] **Step 6: Merge develop → main**

Seguindo o feedback de workflow do projeto (`feedback_git_workflow.md`): após push em develop, equalizar main:

```bash
git push origin develop
git checkout main
git merge develop
git push origin main
git checkout develop
```

---

# Resumo dos commits esperados

1. `feat(claim): migration claimed_at + índice parcial`
2. `feat(claim): domínio ClaimBy/ReleaseClaim + repo TryClaim atômico`
3. `feat(claim): RequestClaimService com outcomes Success/Conflict/NotFound`
4. `feat(claim): eventos SignalR RequestClaimed/RequestReleased`
5. `feat(claim): endpoint POST /api/requests/{id}/claim`
6. `feat(claim): ClaimTimeoutBackgroundService libera stale claims (10min)`
7. `feat(claim-mobile): adiciona claimRequest(id) no api layer`
8. `feat(claim-mobile): detalhe read-only + botão Iniciar revisão`
9. `feat(claim-mobile): listeners SignalR RequestClaimed/Released`
10. `feat(claim-mobile): modo foco remove pedido do snapshot ao ver RequestClaimed`
11. `feat(claim-web): detail read-only + botão Iniciar revisão`
12. `feat(claim-web): listeners SignalR RequestClaimed/Released`

---

# Notas de riscos e mitigações

- **Multi-instância do backend:** o `ClaimTimeoutBackgroundService` roda em todos os pods. O UPDATE é idempotente (`WHERE claimed_at < NOW() - 10min`), então sem corrupção, mas eventos SignalR podem duplicar. Aceitável — a invalidação do cache no frontend é idempotente. Fix definitivo (Redis lock) alinhado com dívida técnica de batch sign (`project_batch_sign_audit.md`).

- **Lint-staged no commit:** o projeto usa lint-staged. Se o commit falhar por lint, corrigir e criar NOVO commit (nunca amend, conforme `CLAUDE.md`).

- **Patterns de HTTP client:** os examples de Task 9, 10, 13, 14 usam nomes de helpers placeholder (`apiPost`, `authenticatedFetch`). SEMPRE ler o arquivo primeiro pra usar o helper real do projeto.

- **Payload do claim no controller:** a Task 7 retorna `MedicalRequest` diretamente. Se o padrão do projeto for mapear para `RequestResponseDto` (ver `RequestApprovalController.Approve`), seguir esse padrão — pode exigir injetar `IRequestQueryService` ou um helper de mapeamento no controller.
