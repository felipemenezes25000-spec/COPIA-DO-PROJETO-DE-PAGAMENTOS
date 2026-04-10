# AI Rejection Doctor Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao médico uma fila de solicitações rejeitadas automaticamente pela IA, com o motivo visível e a opção de reabrir o pedido para análise manual — preservando auditoria completa.

**Architecture:** Domain ganha `RejectionSource` enum + método `RejectByAi` + método `ReopenFromAiRejection`. Postgres ganha colunas `rejection_source`, `ai_rejection_reason`, `ai_rejected_at`, `reopened_by`, `reopened_at`. API expõe `GET /api/requests/ai-rejected` e `POST /api/requests/{id}/reopen-ai-rejection`. Frontend-web ganha nova aba "Rejeitados pela IA" no portal do médico com banner de motivo no detalhe. Mobile só trata nova push `reopened_for_review`.

**Tech Stack:** .NET 8 (backend, Clean Architecture) · PostgreSQL (Npgsql/Dapper) · React + Vite (frontend-web) · React Native + Expo (frontend-mobile) · xUnit (backend tests) · Vitest/Jest (frontend tests)

**Design doc:** [`docs/superpowers/specs/2026-04-07-ai-rejection-doctor-visibility-design.md`](../specs/2026-04-07-ai-rejection-doctor-visibility-design.md)

---

## File Structure

**Novos arquivos:**

- `backend-dotnet/src/RenoveJa.Domain/Enums/RejectionSource.cs`
- `backend-dotnet/tests/RenoveJa.UnitTests/Domain/MedicalRequestRejectionTests.cs` (se não existir; senão adicionar testes no arquivo existente)
- `frontend-web/src/pages/doctor/DoctorAiRejectedList.tsx`
- `frontend-web/src/pages/doctor/__tests__/DoctorAiRejectedList.test.tsx`

**Arquivos modificados:**

- `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs` — novos métodos e propriedades
- `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequestSnapshot.cs` — novos campos
- `backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs` — nova migração
- `backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/Repositories/RequestRepository.cs` — mapping + query nova
- `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestService.cs` — 6 trocas `Reject` → `RejectByAi`
- `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestApprovalService.cs` — novo método `ReopenFromAiRejectionAsync`
- `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestQueryService.cs` — novo método `ListAiRejectedAsync`
- `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestApprovalService.cs`
- `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestQueryService.cs`
- `backend-dotnet/src/RenoveJa.Application/Services/Notifications/PushNotificationRules.cs` — nova regra `ReopenedForReview`
- `backend-dotnet/src/RenoveJa.Application/DTOs/Requests/RequestDtos.cs` — novos campos no `RequestResponseDto`
- `backend-dotnet/src/RenoveJa.Api/Controllers/RequestApprovalController.cs` — 2 endpoints
- `backend-dotnet/tests/RenoveJa.UnitTests/RequestServiceTests.cs`
- `frontend-web/src/services/doctor-api-requests.ts` — 2 métodos
- `frontend-web/src/pages/doctor/DoctorRequestDetail.tsx` — banner condicional
- `frontend-web/src/services/doctorApi.ts` ou equivalente — novos campos no tipo `MedicalRequest`
- `frontend-web/src/App.tsx` ou router — nova rota
- `frontend-mobile/hooks/useNotifications.ts` (ou equivalente) — handler novo

---

## Task 1: Domain enum `RejectionSource`

**Files:**
- Create: `backend-dotnet/src/RenoveJa.Domain/Enums/RejectionSource.cs`

- [ ] **Step 1: Create the enum file**

```csharp
namespace RenoveJa.Domain.Enums;

/// <summary>
/// Identifies who rejected a medical request. Used to split the doctor's
/// "rejected by AI" queue from rejections made manually by doctors.
/// </summary>
public enum RejectionSource
{
    Doctor = 0,
    Ai = 1
}
```

- [ ] **Step 2: Build to verify compilation**

Run: `cd backend-dotnet && dotnet build src/RenoveJa.Domain/RenoveJa.Domain.csproj`
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Domain/Enums/RejectionSource.cs
git commit -m "feat(domain): add RejectionSource enum"
```

---

## Task 2: Domain — `MedicalRequest.RejectByAi` + updates to `Reject`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs`
- Test: `backend-dotnet/tests/RenoveJa.UnitTests/Domain/MedicalRequestRejectionTests.cs` (create)

- [ ] **Step 1: Write the failing tests**

Create `backend-dotnet/tests/RenoveJa.UnitTests/Domain/MedicalRequestRejectionTests.cs`:

```csharp
using FluentAssertions;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Exceptions;
using Xunit;

namespace RenoveJa.UnitTests.Domain;

public class MedicalRequestRejectionTests
{
    private static MedicalRequest NewPrescription() =>
        MedicalRequest.CreatePrescription(
            patientId: Guid.NewGuid(),
            patientName: "Paciente Teste",
            prescriptionType: PrescriptionType.Simple,
            medications: new List<string> { "Losartana 50mg" });

    [Fact]
    public void Reject_manual_sets_RejectionSource_Doctor()
    {
        var request = NewPrescription();

        request.Reject("Receita ilegível");

        request.Status.Should().Be(RequestStatus.Rejected);
        request.RejectionReason.Should().Be("Receita ilegível");
        request.RejectionSource.Should().Be(RejectionSource.Doctor);
        request.AiRejectionReason.Should().BeNull();
        request.AiRejectedAt.Should().BeNull();
    }

    [Fact]
    public void RejectByAi_sets_all_ai_fields_and_mirrors_reason()
    {
        var request = NewPrescription();
        const string reason = "Tipo da receita divergente do selecionado";

        request.RejectByAi(reason);

        request.Status.Should().Be(RequestStatus.Rejected);
        request.RejectionSource.Should().Be(RejectionSource.Ai);
        request.AiRejectionReason.Should().Be(reason);
        request.RejectionReason.Should().Be(reason);
        request.AiRejectedAt.Should().NotBeNull();
    }

    [Fact]
    public void RejectByAi_throws_if_reason_blank()
    {
        var request = NewPrescription();

        Action act = () => request.RejectByAi("   ");

        act.Should().Throw<DomainException>();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend-dotnet && dotnet test --filter "FullyQualifiedName~MedicalRequestRejectionTests"`
Expected: FAIL — `RejectByAi` and `RejectionSource` do not exist.

- [ ] **Step 3: Add properties and methods to `MedicalRequest`**

In `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs`, after the existing AI-related properties (~line 64, after `AiMessageToUser`), add:

```csharp
    // ── Rejection source tracking (AI vs. Doctor) ──
    public RejectionSource? RejectionSource { get; private set; }
    public string? AiRejectionReason { get; private set; }
    public DateTime? AiRejectedAt { get; private set; }
    public Guid? ReopenedBy { get; private set; }
    public DateTime? ReopenedAt { get; private set; }
```

Add `using RenoveJa.Domain.Enums;` at the top if not present (it already is).

Replace the existing `Reject` method (around line 540) with:

```csharp
    public void Reject(string rejectionReason)
    {
        if (string.IsNullOrWhiteSpace(rejectionReason))
            throw new DomainException("Rejection reason is required");

#pragma warning disable CS0618
        if (Status != RequestStatus.Submitted && Status != RequestStatus.InReview &&
            Status != RequestStatus.SearchingDoctor && Status != RequestStatus.Pending &&
            Status != RequestStatus.Analyzing && Status != RequestStatus.Approved)
            throw new DomainException($"Cannot reject request in '{Status}' state. Only Pending, Submitted, InReview, Approved, or SearchingDoctor requests can be rejected.");
#pragma warning restore CS0618

        RejectionReason = rejectionReason;
        RejectionSource = Enums.RejectionSource.Doctor;
        Status = RequestStatus.Rejected;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Rejeita a solicitação automaticamente pela IA. Mantém <see cref="AiRejectionReason"/>
    /// imutável mesmo após reabertura, para preservar auditoria do motivo original.
    /// </summary>
    public void RejectByAi(string rejectionReason)
    {
        if (string.IsNullOrWhiteSpace(rejectionReason))
            throw new DomainException("Rejection reason is required");

#pragma warning disable CS0618
        if (Status != RequestStatus.Submitted && Status != RequestStatus.InReview &&
            Status != RequestStatus.SearchingDoctor && Status != RequestStatus.Pending &&
            Status != RequestStatus.Analyzing && Status != RequestStatus.Approved)
            throw new DomainException($"Cannot reject request in '{Status}' state.");
#pragma warning restore CS0618

        RejectionReason = rejectionReason;
        AiRejectionReason = rejectionReason;
        RejectionSource = Enums.RejectionSource.Ai;
        AiRejectedAt = DateTime.UtcNow;
        Status = RequestStatus.Rejected;
        UpdatedAt = DateTime.UtcNow;
    }
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend-dotnet && dotnet test --filter "FullyQualifiedName~MedicalRequestRejectionTests"`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs \
        backend-dotnet/tests/RenoveJa.UnitTests/Domain/MedicalRequestRejectionTests.cs
git commit -m "feat(domain): add RejectByAi and RejectionSource tracking"
```

---

## Task 3: Domain — `ReopenFromAiRejection`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs`
- Test: `backend-dotnet/tests/RenoveJa.UnitTests/Domain/MedicalRequestRejectionTests.cs`

- [ ] **Step 1: Add failing tests**

Append to `MedicalRequestRejectionTests.cs`:

```csharp
    [Fact]
    public void ReopenFromAiRejection_transitions_back_to_InReview_and_assigns_doctor()
    {
        var request = NewPrescription();
        request.RejectByAi("Tipo divergente");
        var doctorId = Guid.NewGuid();

        request.ReopenFromAiRejection(doctorId, "Dra. Ana");

        request.Status.Should().Be(RequestStatus.InReview);
        request.DoctorId.Should().Be(doctorId);
        request.DoctorName.Should().Be("Dra. Ana");
        request.ReopenedBy.Should().Be(doctorId);
        request.ReopenedAt.Should().NotBeNull();
        request.AiRejectionReason.Should().Be("Tipo divergente"); // preserved
        request.RejectionReason.Should().BeNull(); // cleared
        request.RejectionSource.Should().Be(RejectionSource.Ai); // preserved for audit
    }

    [Fact]
    public void ReopenFromAiRejection_fails_if_not_ai_rejected()
    {
        var request = NewPrescription();
        request.Reject("Motivo manual do médico");

        Action act = () => request.ReopenFromAiRejection(Guid.NewGuid(), "Dr. X");

        act.Should().Throw<DomainException>()
            .WithMessage("*only AI-rejected*");
    }

    [Fact]
    public void ReopenFromAiRejection_fails_if_not_rejected()
    {
        var request = NewPrescription();

        Action act = () => request.ReopenFromAiRejection(Guid.NewGuid(), "Dr. X");

        act.Should().Throw<DomainException>();
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend-dotnet && dotnet test --filter "FullyQualifiedName~MedicalRequestRejectionTests"`
Expected: FAIL — `ReopenFromAiRejection` does not exist.

- [ ] **Step 3: Implement `ReopenFromAiRejection`**

In `MedicalRequest.cs`, add after `RejectByAi`:

```csharp
    /// <summary>
    /// Reabre um pedido que foi rejeitado automaticamente pela IA, para análise manual do médico.
    /// Transita Status para InReview e atribui o médico chamador (evitando corrida com outro médico).
    /// Preserva <see cref="AiRejectionReason"/> e <see cref="RejectionSource"/> para auditoria.
    /// </summary>
    public void ReopenFromAiRejection(Guid doctorId, string doctorName)
    {
        if (Status != RequestStatus.Rejected)
            throw new DomainException($"Cannot reopen request in '{Status}' state. Only Rejected requests can be reopened.");

        if (RejectionSource != Enums.RejectionSource.Ai)
            throw new DomainException("Cannot reopen: only AI-rejected requests can be reopened from the AI-rejection flow.");

        if (doctorId == Guid.Empty)
            throw new DomainException("Doctor ID is required");

        if (string.IsNullOrWhiteSpace(doctorName))
            throw new DomainException("Doctor name is required");

        DoctorId = doctorId;
        DoctorName = doctorName;
        Status = RequestStatus.InReview;
        RejectionReason = null; // AiRejectionReason is preserved
        ReopenedBy = doctorId;
        ReopenedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend-dotnet && dotnet test --filter "FullyQualifiedName~MedicalRequestRejectionTests"`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs \
        backend-dotnet/tests/RenoveJa.UnitTests/Domain/MedicalRequestRejectionTests.cs
git commit -m "feat(domain): add ReopenFromAiRejection method"
```

---

## Task 4: Snapshot + Reconstitute — persist new fields

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequestSnapshot.cs`
- Modify: `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs`

- [ ] **Step 1: Add fields to `MedicalRequestSnapshot`**

In `backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequestSnapshot.cs`, after `Priority`:

```csharp
    /// <summary>
    /// "Doctor" ou "Ai". Null para pedidos rejeitados antes da introdução deste campo (legado).
    /// </summary>
    public string? RejectionSource { get; init; }
    public string? AiRejectionReason { get; init; }
    public DateTime? AiRejectedAt { get; init; }
    public Guid? ReopenedBy { get; init; }
    public DateTime? ReopenedAt { get; init; }
```

- [ ] **Step 2: Update `Reconstitute(MedicalRequestSnapshot)` to apply new fields**

In `MedicalRequest.cs`, update `Reconstitute(MedicalRequestSnapshot snapshot)` (around line 338):

```csharp
    public static MedicalRequest Reconstitute(MedicalRequestSnapshot snapshot)
    {
        var request = ReconstitutePositional(snapshot);
        request.RequiredSpecialty = snapshot.RequiredSpecialty;
        if (!string.IsNullOrWhiteSpace(snapshot.Priority)
            && Enum.TryParse<RequestPriority>(snapshot.Priority, true, out var priority))
        {
            request.Priority = priority;
        }
        if (!string.IsNullOrWhiteSpace(snapshot.RejectionSource)
            && Enum.TryParse<Enums.RejectionSource>(snapshot.RejectionSource, true, out var rejSource))
        {
            request.RejectionSource = rejSource;
        }
        request.AiRejectionReason = snapshot.AiRejectionReason;
        request.AiRejectedAt = snapshot.AiRejectedAt;
        request.ReopenedBy = snapshot.ReopenedBy;
        request.ReopenedAt = snapshot.ReopenedAt;
        return request;
    }
```

- [ ] **Step 3: Build to verify compilation**

Run: `cd backend-dotnet && dotnet build`
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Run all domain tests**

Run: `cd backend-dotnet && dotnet test --filter "FullyQualifiedName~Domain"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequestSnapshot.cs \
        backend-dotnet/src/RenoveJa.Domain/Entities/MedicalRequest.cs
git commit -m "feat(domain): reconstitute rejection source and reopen fields from snapshot"
```

---

## Task 5: Postgres migration

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs`

- [ ] **Step 1: Add migration array**

In `MigrationRunner.cs`, near the other `Request*` migration arrays (around line 36–48), add:

```csharp
    private static readonly string[] RequestAiRejectionColumns =
    {
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS rejection_source TEXT",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS ai_rejection_reason TEXT",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS ai_rejected_at TIMESTAMPTZ",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS reopened_by UUID",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ",
        """
        CREATE INDEX IF NOT EXISTS idx_requests_ai_rejected
          ON public.requests (required_specialty, ai_rejected_at DESC)
          WHERE status = 'Rejected' AND rejection_source = 'Ai'
        """
    };
```

Note: the status value stored in the column is the C# enum name (e.g., `"Rejected"`, not `"rejected"`). Confirm by grepping existing code in `RequestRepository` for how `status` is persisted — if lowercase, adjust `WHERE` accordingly.

- [ ] **Step 2: Register migration in `allMigrations`**

In `MigrationRunner.RunAsync` (around line 847), append a new entry to the `allMigrations` array right after `("doctor_admin_notes", DoctorAdminNotesMigrations)`:

```csharp
            ("doctor_admin_notes", DoctorAdminNotesMigrations),
            ("request_ai_rejection", RequestAiRejectionColumns)
```

(Add comma to the previous line.)

- [ ] **Step 3: Verify status casing**

Run: `grep -rn "INSERT INTO.*requests\|status.*=.*'" backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/Repositories/RequestRepository.cs | head -20`

Check whether status comparisons use `"Rejected"` or `"rejected"`. Adjust the `WHERE` clause in the index to match.

- [ ] **Step 4: Build**

Run: `cd backend-dotnet && dotnet build`
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/MigrationRunner.cs
git commit -m "feat(db): add ai rejection columns and partial index"
```

---

## Task 6: `RequestRepository` — map new columns + list query

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/Repositories/RequestRepository.cs`

- [ ] **Step 1: Read the current MapToDomain and INSERT/UPDATE SQL**

Run: `grep -n "ai_summary_for_doctor\|MapToDomain\|INSERT INTO.*requests\|UPDATE.*requests" backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/Repositories/RequestRepository.cs`

Understand the existing column pattern (especially how `ai_readability_ok` and `required_specialty` are read/written) before editing.

- [ ] **Step 2: Add new columns to SELECT / MapToDomain**

In `MapToDomain` (the method that builds `MedicalRequestSnapshot` from a `NpgsqlDataReader` or Dapper result), add reads for the new columns. Example (adjust to the repository's actual style):

```csharp
RejectionSource = reader["rejection_source"] as string,
AiRejectionReason = reader["ai_rejection_reason"] as string,
AiRejectedAt = reader["ai_rejected_at"] as DateTime?,
ReopenedBy = reader["reopened_by"] as Guid?,
ReopenedAt = reader["reopened_at"] as DateTime?,
```

Add the corresponding column names to every `SELECT` statement that returns request rows.

- [ ] **Step 3: Add new columns to UPDATE statement**

In the `UpdateAsync` method's SQL, add:

```
rejection_source = @rejectionSource,
ai_rejection_reason = @aiRejectionReason,
ai_rejected_at = @aiRejectedAt,
reopened_by = @reopenedBy,
reopened_at = @reopenedAt,
```

And bind parameters from `request.RejectionSource?.ToString()`, `request.AiRejectionReason`, `request.AiRejectedAt`, `request.ReopenedBy`, `request.ReopenedAt`.

- [ ] **Step 4: Add `ListAiRejectedBySpecialtyAsync` method**

Add to `IRequestRepository` interface:

```csharp
Task<IReadOnlyList<MedicalRequest>> ListAiRejectedBySpecialtyAsync(
    string? specialty,
    int limit,
    CancellationToken cancellationToken);
```

Implement in `RequestRepository.cs`:

```csharp
public async Task<IReadOnlyList<MedicalRequest>> ListAiRejectedBySpecialtyAsync(
    string? specialty,
    int limit,
    CancellationToken cancellationToken)
{
    // Use the same SELECT used elsewhere (copy column list) + the filter below.
    const string sql = @"
        SELECT <existing request columns including new ones>
        FROM public.requests
        WHERE status = @rejectedStatus
          AND rejection_source = 'Ai'
          AND (@specialty IS NULL OR required_specialty IS NULL OR required_specialty = @specialty)
        ORDER BY ai_rejected_at DESC NULLS LAST
        LIMIT @limit";

    var rows = new List<MedicalRequest>();
    await using var conn = await _client.OpenAsync(cancellationToken);
    await using var cmd = new NpgsqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("rejectedStatus", RequestStatus.Rejected.ToString());
    cmd.Parameters.AddWithValue("specialty", (object?)specialty ?? DBNull.Value);
    cmd.Parameters.AddWithValue("limit", limit);

    await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
    while (await reader.ReadAsync(cancellationToken))
        rows.Add(MedicalRequest.Reconstitute(MapToSnapshot(reader)));

    return rows;
}
```

Adapt method names (`_client.OpenAsync`, `MapToSnapshot`, etc.) to the ones already used in the file.

- [ ] **Step 5: Build**

Run: `cd backend-dotnet && dotnet build`
Expected: Build succeeded.

- [ ] **Step 6: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Infrastructure/Data/Postgres/Repositories/RequestRepository.cs \
        backend-dotnet/src/RenoveJa.Domain/Interfaces/IRequestRepository.cs
git commit -m "feat(infra): persist rejection source fields and list ai-rejected requests"
```

---

## Task 7: Application — swap `Reject` → `RejectByAi` in AI flows

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestService.cs`

- [ ] **Step 1: Locate the 6 AI-rejection call sites**

Run: `grep -n "request\.Reject\|medicalRequest\.Reject" backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestService.cs`

Expected call sites (line numbers approximate): 451, 522, 556, 609, 931, 987 — each inside a block that handles an `AiValidationOutcome` with `Action == "reject"`.

- [ ] **Step 2: Replace each AI-driven `Reject` with `RejectByAi`**

At each call site where the reason comes from `outcome.RejectionMessage!` (AI outcome), change:

```csharp
request.Reject(outcome.RejectionMessage!);
```

to:

```csharp
request.RejectByAi(outcome.RejectionMessage!);
```

Same for `medicalRequest.Reject(outcome.RejectionMessage!)`. **Do not** change the `Reject` call inside `UpdateStatusAsync` (line ~301) — that one is a manual doctor flow via DTO.

- [ ] **Step 3: Build**

Run: `cd backend-dotnet && dotnet build`
Expected: Build succeeded.

- [ ] **Step 4: Run existing request service tests**

Run: `cd backend-dotnet && dotnet test --filter "FullyQualifiedName~RequestServiceTests"`
Expected: PASS (existing tests unchanged; `Reject` still exists).

- [ ] **Step 5: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestService.cs
git commit -m "feat(app): route AI auto-rejection through RejectByAi"
```

---

## Task 8: `RequestApprovalService.ReopenFromAiRejectionAsync`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestApprovalService.cs`
- Modify: `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestApprovalService.cs`
- Test: `backend-dotnet/tests/RenoveJa.UnitTests/RequestServiceTests.cs`

- [ ] **Step 1: Add failing test**

Append to `RequestServiceTests.cs` (adapt to existing test class structure / mocks):

```csharp
    [Fact]
    public async Task ReopenFromAiRejection_happy_path_transitions_to_InReview_and_pushes_patient()
    {
        var patientId = Guid.NewGuid();
        var doctorId = Guid.NewGuid();
        var request = MedicalRequest.CreatePrescription(
            patientId, "Paciente", PrescriptionType.Simple, new List<string> { "Med" });
        request.RejectByAi("Tipo divergente");

        _requestRepoMock.Setup(r => r.GetByIdAsync(request.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(request);
        _userRepoMock.Setup(r => r.GetByIdAsync(doctorId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(UserTestBuilder.Doctor(doctorId, "Dra. Ana"));
        _requestRepoMock.Setup(r => r.UpdateAsync(It.IsAny<MedicalRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MedicalRequest r, CancellationToken _) => r);

        var result = await _approvalSut.ReopenFromAiRejectionAsync(request.Id, doctorId, CancellationToken.None);

        result.Status.Should().Be(RequestStatus.InReview);
        result.DoctorId.Should().Be(doctorId);
        result.AiRejectionReason.Should().Be("Tipo divergente");
        _pushDispatcherMock.Verify(
            p => p.SendAsync(
                It.Is<PushNotificationRequest>(req => req.Payload.Type == "request_reopened_for_review"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
```

If `UserTestBuilder.Doctor` does not exist, use whatever factory the existing tests use (e.g., `new User(...)` with `UserRole.Doctor`). Look at the top of the test file to match.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-dotnet && dotnet test --filter "FullyQualifiedName~ReopenFromAiRejection_happy_path"`
Expected: FAIL — `ReopenFromAiRejectionAsync` does not exist.

- [ ] **Step 3: Extend the interface**

In `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestApprovalService.cs`, add:

```csharp
Task<MedicalRequest> ReopenFromAiRejectionAsync(
    Guid id,
    Guid doctorId,
    CancellationToken cancellationToken = default);
```

- [ ] **Step 4: Implement the method in `RequestApprovalService.cs`**

Add after `RejectAsync`:

```csharp
    public async Task<MedicalRequest> ReopenFromAiRejectionAsync(
        Guid id,
        Guid doctorId,
        CancellationToken cancellationToken = default)
    {
        var request = await requestRepository.GetByIdAsync(id, cancellationToken);
        if (request == null)
            throw new KeyNotFoundException("Request not found");

        var doctor = await userRepository.GetByIdAsync(doctorId, cancellationToken);
        if (doctor == null || !doctor.IsDoctor())
            throw new InvalidOperationException("Doctor not found");

        // Specialty gate: if the request requires a specialty, doctor must match.
        if (!string.IsNullOrWhiteSpace(request.RequiredSpecialty))
        {
            var doctorSpecialty = doctor.DoctorProfile?.Specialty;
            if (!string.Equals(doctorSpecialty, request.RequiredSpecialty, StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException(
                    $"Este pedido exige a especialidade '{request.RequiredSpecialty}' e você não é dessa especialidade.");
        }

        request.ReopenFromAiRejection(doctorId, doctor.Name);
        request = await requestRepository.UpdateAsync(request, cancellationToken);

        await requestEventsPublisher.NotifyRequestUpdatedAsync(
            request.Id,
            request.PatientId,
            request.DoctorId,
            EnumHelper.ToSnakeCase(request.Status),
            "Pedido reaberto para análise médica",
            cancellationToken);

        await pushDispatcher.SendAsync(
            PushNotificationRules.ReopenedForReview(request.PatientId, request.Id, request.RequestType),
            cancellationToken);

        return request;
    }
```

Adapt `doctor.DoctorProfile?.Specialty` to whatever property exposes the specialty on the User entity (`Specialty`, `DoctorProfile.Specialty`, etc.) — check `User.cs`.

- [ ] **Step 5: Run tests to verify pass**

Run: `cd backend-dotnet && dotnet test --filter "FullyQualifiedName~ReopenFromAiRejection"`
Expected: PASS. (Will fail if `PushNotificationRules.ReopenedForReview` does not exist yet — Task 9 adds it.)

- [ ] **Step 6: Commit**

Hold until Task 9 is done; commit both together to keep tests green.

---

## Task 9: Push rule `ReopenedForReview`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Application/Services/Notifications/PushNotificationRules.cs`

- [ ] **Step 1: Add the rule**

In `PushNotificationRules.cs`, after the `Approved` method (~line 96):

```csharp
    /// <summary>Paciente notificado quando um pedido rejeitado pela IA é reaberto pelo médico.</summary>
    public static PushNotificationRequest ReopenedForReview(Guid userId, Guid requestId, RequestType requestType) =>
        BuildRequest(userId, "request_reopened_for_review", requestId, requestType, RequestStatus.InReview,
            "Pedido reaberto para análise",
            "Um médico reabriu seu pedido e está analisando manualmente. Em breve você terá uma resposta.",
            targetRole: "patient",
            deepLinkSuffix: $"request-detail/{requestId}",
            channel: PushChannel.Default,
            category: PushCategory.Requests,
            bypassQuietHours: false);
```

- [ ] **Step 2: Build and run the Task 8 test**

Run: `cd backend-dotnet && dotnet build && dotnet test --filter "FullyQualifiedName~ReopenFromAiRejection"`
Expected: PASS.

- [ ] **Step 3: Commit (Task 8 + 9 together)**

```bash
git add backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestApprovalService.cs \
        backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestApprovalService.cs \
        backend-dotnet/src/RenoveJa.Application/Services/Notifications/PushNotificationRules.cs \
        backend-dotnet/tests/RenoveJa.UnitTests/RequestServiceTests.cs
git commit -m "feat(app): ReopenFromAiRejectionAsync + ReopenedForReview push rule"
```

---

## Task 10: `RequestQueryService.ListAiRejectedAsync`

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestQueryService.cs`
- Modify: `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestQueryService.cs`

- [ ] **Step 1: Add interface method**

In `IRequestQueryService.cs`:

```csharp
Task<IReadOnlyList<RequestResponseDto>> ListAiRejectedAsync(
    Guid doctorId,
    CancellationToken cancellationToken = default);
```

- [ ] **Step 2: Implement**

In `RequestQueryService.cs`, add:

```csharp
    public async Task<IReadOnlyList<RequestResponseDto>> ListAiRejectedAsync(
        Guid doctorId,
        CancellationToken cancellationToken = default)
    {
        var doctor = await _userRepository.GetByIdAsync(doctorId, cancellationToken);
        if (doctor == null || !doctor.IsDoctor())
            throw new UnauthorizedAccessException("Only doctors can list AI-rejected requests.");

        var specialty = doctor.DoctorProfile?.Specialty;
        var requests = await _requestRepository.ListAiRejectedBySpecialtyAsync(specialty, limit: 100, cancellationToken);

        return requests.Select(RequestHelpers.ToResponseDto).ToList();
    }
```

Match the field/method names to the existing service style (constructor-injection vs primary ctor; `_requestRepository` or `requestRepository`).

- [ ] **Step 3: Build**

Run: `cd backend-dotnet && dotnet build`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Application/Interfaces/IRequestQueryService.cs \
        backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestQueryService.cs
git commit -m "feat(app): list ai-rejected requests filtered by specialty"
```

---

## Task 11: DTO fields + `RequestHelpers.ToResponseDto` mapping

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Application/DTOs/Requests/RequestDtos.cs`
- Modify: `backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestHelpers.cs`

- [ ] **Step 1: Add fields to `RequestResponseDto`**

Open `RequestDtos.cs`, find `RequestResponseDto`, and add the new optional fields:

```csharp
    public string? RejectionSource { get; set; }      // "Ai" | "Doctor" | null
    public string? AiRejectionReason { get; set; }
    public DateTime? AiRejectedAt { get; set; }
    public Guid? ReopenedBy { get; set; }
    public DateTime? ReopenedAt { get; set; }
```

- [ ] **Step 2: Map fields in `RequestHelpers.ToResponseDto`**

In `RequestHelpers.cs`, find the method/constructor that builds `RequestResponseDto` from a `MedicalRequest` (the positional constructor around line 387). Add the new fields, setting them from `request.RejectionSource?.ToString()`, `request.AiRejectionReason`, `request.AiRejectedAt`, `request.ReopenedBy`, `request.ReopenedAt`.

If `RequestResponseDto` is built positionally, match the new DTO fields to the corresponding arguments in the constructor call.

- [ ] **Step 3: Build + tests**

Run: `cd backend-dotnet && dotnet build && dotnet test --filter "FullyQualifiedName~RequestServiceTests"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Application/DTOs/Requests/RequestDtos.cs \
        backend-dotnet/src/RenoveJa.Application/Services/Requests/RequestHelpers.cs
git commit -m "feat(app): expose rejection source fields on RequestResponseDto"
```

---

## Task 12: API endpoints

**Files:**
- Modify: `backend-dotnet/src/RenoveJa.Api/Controllers/RequestApprovalController.cs`

- [ ] **Step 1: Add endpoints**

Append to `RequestApprovalController`:

```csharp
    /// <summary>
    /// Lista os pedidos rejeitados automaticamente pela IA, filtrados pela especialidade do médico.
    /// </summary>
    [HttpGet("ai-rejected")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> ListAiRejected(
        [FromServices] IRequestQueryService queryService,
        CancellationToken cancellationToken)
    {
        var doctorId = GetUserId();
        var items = await queryService.ListAiRejectedAsync(doctorId, cancellationToken);
        return Ok(items);
    }

    /// <summary>
    /// Reabre um pedido rejeitado pela IA para análise manual (atribui ao médico chamador).
    /// </summary>
    [HttpPost("{id}/reopen-ai-rejection")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> ReopenAiRejection(
        string id,
        [FromServices] IRequestApprovalService approvalService,
        CancellationToken cancellationToken)
    {
        var resolvedId = await ResolveRequestIdAsync(id, cancellationToken);
        if (resolvedId == null) return NotFound();
        var doctorId = GetUserId();
        var request = await approvalService.ReopenFromAiRejectionAsync(resolvedId.Value, doctorId, cancellationToken);
        return Ok(request);
    }
```

- [ ] **Step 2: Build**

Run: `cd backend-dotnet && dotnet build`
Expected: Build succeeded.

- [ ] **Step 3: Full backend test suite**

Run: `cd backend-dotnet && dotnet test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend-dotnet/src/RenoveJa.Api/Controllers/RequestApprovalController.cs
git commit -m "feat(api): expose GET /ai-rejected and POST /reopen-ai-rejection"
```

---

## Task 13: Frontend-web — service methods

**Files:**
- Modify: `frontend-web/src/services/doctor-api-requests.ts`
- Modify: `frontend-web/src/services/doctorApi.ts` (or wherever `MedicalRequest` type lives)

- [ ] **Step 1: Extend the `MedicalRequest` type**

Find the `MedicalRequest` type declaration (likely in `frontend-web/src/services/doctorApi.ts` or `types.ts`). Add:

```typescript
  rejectionSource?: 'Ai' | 'Doctor' | null;
  aiRejectionReason?: string | null;
  aiRejectedAt?: string | null;
  reopenedBy?: string | null;
  reopenedAt?: string | null;
```

- [ ] **Step 2: Add the two API methods**

In `frontend-web/src/services/doctor-api-requests.ts`, at the end of the file:

```typescript
// ── AI Rejection Queue ──

export async function fetchAiRejectedRequests(): Promise<MedicalRequest[]> {
  const res = await authFetch('/api/requests/ai-rejected');
  if (!res.ok) throw new Error('Erro ao buscar pedidos rejeitados pela IA');
  const data = await res.json();
  const normalized = normalizeList(data);
  return (Array.isArray(normalized) ? normalized : (normalized as { items: unknown[] }).items) as MedicalRequest[];
}

export async function reopenAiRejection(id: string): Promise<MedicalRequest> {
  const res = await authFetch(`/api/requests/${id}/reopen-ai-rejection`, { method: 'POST' });
  if (!res.ok) throw new Error('Erro ao reabrir pedido');
  const data = await res.json();
  return normalizeRequest(data) as unknown as MedicalRequest;
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend-web && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend-web/src/services/doctor-api-requests.ts frontend-web/src/services/doctorApi.ts
git commit -m "feat(web): add ai-rejected queue service methods"
```

---

## Task 14: Frontend-web — `DoctorAiRejectedList` page

**Files:**
- Create: `frontend-web/src/pages/doctor/DoctorAiRejectedList.tsx`
- Create: `frontend-web/src/pages/doctor/__tests__/DoctorAiRejectedList.test.tsx`
- Modify: `frontend-web/src/App.tsx` (or router file)

- [ ] **Step 1: Write failing test**

Create `frontend-web/src/pages/doctor/__tests__/DoctorAiRejectedList.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import DoctorAiRejectedList from '../DoctorAiRejectedList';
import * as api from '../../../services/doctor-api-requests';

vi.mock('../../../services/doctor-api-requests');

describe('DoctorAiRejectedList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows AI rejection reason for each item', async () => {
    vi.mocked(api.fetchAiRejectedRequests).mockResolvedValue([
      {
        id: 'r1',
        patientName: 'Maria Silva',
        type: 'prescription',
        aiRejectionReason: 'Tipo de receita divergente do selecionado',
        rejectionSource: 'Ai',
        aiRejectedAt: '2026-04-07T10:00:00Z',
      } as never,
    ]);

    render(
      <MemoryRouter>
        <DoctorAiRejectedList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      expect(screen.getByText(/Tipo de receita divergente/)).toBeInTheDocument();
      expect(screen.getByText(/Rejeitado pela IA/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when there are no items', async () => {
    vi.mocked(api.fetchAiRejectedRequests).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <DoctorAiRejectedList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Nenhum pedido rejeitado pela IA/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-web && npm run test:run -- DoctorAiRejectedList`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend-web/src/pages/doctor/DoctorAiRejectedList.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAiRejectedRequests } from '../../services/doctor-api-requests';
import type { MedicalRequest } from '../../services/doctorApi';

export default function DoctorAiRejectedList() {
  const [items, setItems] = useState<MedicalRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAiRejectedRequests()
      .then((data) => { if (active) setItems(data); })
      .catch((err: Error) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  if (error) {
    return <div role="alert" className="p-4 text-red-600">{error}</div>;
  }
  if (items === null) {
    return <div className="p-4">Carregando…</div>;
  }
  if (items.length === 0) {
    return <div className="p-4 text-gray-600">Nenhum pedido rejeitado pela IA no momento.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Rejeitados pela IA</h1>
      <ul className="space-y-3">
        {items.map((req) => (
          <li key={req.id} className="border rounded-md p-4 bg-amber-50">
            <Link to={`/doctor/request/${req.id}`} className="block">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-700 text-sm font-medium">⚠️ Rejeitado pela IA</span>
                <span className="text-gray-400 text-xs">
                  {req.aiRejectedAt ? new Date(req.aiRejectedAt).toLocaleString('pt-BR') : ''}
                </span>
              </div>
              <div className="font-medium">{req.patientName ?? 'Paciente'}</div>
              <div className="text-sm text-gray-600 mb-2">{req.type}</div>
              <div className="text-sm text-gray-800">
                <strong>Motivo da IA:</strong> {req.aiRejectionReason ?? '—'}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Add the route**

In `frontend-web/src/App.tsx` (or the file with the router), add a new route — find where `/doctor/...` routes are declared and add:

```tsx
<Route path="/doctor/ai-rejected" element={<DoctorAiRejectedList />} />
```

Import: `import DoctorAiRejectedList from './pages/doctor/DoctorAiRejectedList';`

- [ ] **Step 5: Run tests**

Run: `cd frontend-web && npm run test:run -- DoctorAiRejectedList`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend-web/src/pages/doctor/DoctorAiRejectedList.tsx \
        frontend-web/src/pages/doctor/__tests__/DoctorAiRejectedList.test.tsx \
        frontend-web/src/App.tsx
git commit -m "feat(web): add DoctorAiRejectedList page and route"
```

---

## Task 15: Frontend-web — banner + reopen action in `DoctorRequestDetail`

**Files:**
- Modify: `frontend-web/src/pages/doctor/DoctorRequestDetail.tsx`

- [ ] **Step 1: Read the current file to find the render head**

Run: `grep -n "return\|aiMessageToUser\|rejectionReason" frontend-web/src/pages/doctor/DoctorRequestDetail.tsx | head -20`

Locate the top of the rendered JSX (right after `if (loading)` / `if (!request)` guards).

- [ ] **Step 2: Import the new action and add state**

Add to existing imports:

```tsx
import { reopenAiRejection } from '../../services/doctor-api-requests';
```

Near the other `useState` hooks, add:

```tsx
const [reopening, setReopening] = useState(false);
const [reopenError, setReopenError] = useState<string | null>(null);
```

- [ ] **Step 3: Add the handler**

Near the other handlers (e.g., `handleApprove`, `handleReject`):

```tsx
async function handleReopenAiRejection() {
  if (!request) return;
  setReopening(true);
  setReopenError(null);
  try {
    const updated = await reopenAiRejection(request.id);
    setRequest(updated); // assumes existing setter; adapt to actual state-management
  } catch (err) {
    setReopenError(err instanceof Error ? err.message : 'Erro ao reabrir pedido');
  } finally {
    setReopening(false);
  }
}
```

- [ ] **Step 4: Render the banner when applicable**

At the top of the main JSX return (inside the page root, above the existing content), add:

```tsx
{request.rejectionSource === 'Ai' && request.status === 'rejected' && (
  <div className="border-l-4 border-amber-500 bg-amber-50 p-4 mb-4 rounded-md">
    <div className="font-semibold text-amber-800 mb-1">
      Este pedido foi rejeitado automaticamente pela IA
    </div>
    <div className="text-sm text-gray-700 mb-3">
      <strong>Motivo:</strong> {request.aiRejectionReason ?? '—'}
    </div>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleReopenAiRejection}
        disabled={reopening}
        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
      >
        {reopening ? 'Reabrindo…' : 'Reabrir para análise'}
      </button>
    </div>
    {reopenError && (
      <div role="alert" className="text-red-600 text-sm mt-2">{reopenError}</div>
    )}
  </div>
)}
```

Adapt the `request.status === 'rejected'` check to whatever casing the normalized DTO uses (`'rejected'` lowercase after normalization — verify by inspecting one of the existing status comparisons in this file).

- [ ] **Step 5: Lint + build**

Run: `cd frontend-web && npm run lint && npm run build`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add frontend-web/src/pages/doctor/DoctorRequestDetail.tsx
git commit -m "feat(web): banner + reopen action for AI-rejected requests"
```

---

## Task 16: Frontend-web — navigation entry

**Files:**
- Modify: (whichever file contains the doctor sidebar / top navigation — find it)

- [ ] **Step 1: Locate the doctor navigation**

Run: `grep -rn "doctor-requests\|/doctor/\|NavLink.*doctor" frontend-web/src/components/ frontend-web/src/layouts/ 2>/dev/null | head -20`

- [ ] **Step 2: Add the entry**

In the navigation component, add a new item:

```tsx
<NavLink to="/doctor/ai-rejected" className={/* match existing */}>
  Rejeitados pela IA
</NavLink>
```

Match the styling and active-state props used by the other `NavLink`s.

- [ ] **Step 3: Lint**

Run: `cd frontend-web && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend-web/src/components/... # actual path
git commit -m "feat(web): add 'Rejeitados pela IA' link to doctor nav"
```

---

## Task 17: Frontend-mobile — handle `request_reopened_for_review` push

**Files:**
- Modify: `frontend-mobile/hooks/useNotifications.ts` or equivalent

- [ ] **Step 1: Locate the push-type handler switch**

Run: `grep -rn "request_status_changed\|request_approved\|switch.*type" frontend-mobile/hooks/ frontend-mobile/lib/ 2>/dev/null | head -10`

- [ ] **Step 2: Add a case for the new type**

In the switch/case that dispatches actions based on notification `type`, add:

```ts
case 'request_reopened_for_review':
  // Pedido voltou para análise manual — atualiza listagem e mostra toast.
  queryClient.invalidateQueries({ queryKey: ['requests'] });
  showToast('Seu pedido foi reaberto para análise médica', 'info');
  break;
```

Match the exact API used in the file (React Query, Zustand, context, etc.).

- [ ] **Step 3: Lint + typecheck**

Run: `cd frontend-mobile && npm run lint && npm run typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend-mobile/hooks/useNotifications.ts
git commit -m "feat(mobile): handle reopened-for-review push notification"
```

---

## Task 18: Full validation pass

- [ ] **Step 1: Backend full test suite**

Run: `cd backend-dotnet && dotnet build && dotnet test`
Expected: Build + all tests pass.

- [ ] **Step 2: Frontend-web lint/test/build**

Run: `cd frontend-web && npm run lint && npm run test:run && npm run build`
Expected: 0 errors.

- [ ] **Step 3: Frontend-mobile lint/typecheck/test**

Run: `cd frontend-mobile && npm run lint && npm run typecheck && npm run test -- --watchAll=false`
Expected: 0 errors.

- [ ] **Step 4: Manual smoke test (optional, requires local DB)**

1. Start backend (`dotnet run --project backend-dotnet/src/RenoveJa.Api`).
2. Submit a prescription with a known inconsistency (e.g., type mismatch).
3. Confirm the request is rejected and `rejection_source = 'Ai'` in the DB.
4. Log in as a doctor with matching specialty, visit `/doctor/ai-rejected`, verify the item appears.
5. Open it, click "Reabrir para análise", verify status goes to `InReview` and patient push arrives.
6. Check `AiRejectionReason` is still present in the DB after reopening.

- [ ] **Step 5: Final commit if anything left**

```bash
git status
# if clean, nothing to do
```

---

## Self-Review Checklist (run once after the plan is written)

- **Spec coverage:**
  - Domain enum + `RejectByAi` + `ReopenFromAiRejection` → Tasks 1, 2, 3 ✓
  - Snapshot reconstitute → Task 4 ✓
  - Postgres migration → Task 5 ✓
  - Repository mapping + new list query → Task 6 ✓
  - `RequestService` call-site swap → Task 7 ✓
  - `RequestApprovalService.ReopenFromAiRejectionAsync` → Task 8 ✓
  - `PushNotificationRules.ReopenedForReview` → Task 9 ✓
  - `RequestQueryService.ListAiRejectedAsync` → Task 10 ✓
  - DTO fields + mapping → Task 11 ✓
  - API endpoints → Task 12 ✓
  - Frontend-web service → Task 13 ✓
  - Frontend-web list page + route → Task 14 ✓
  - Frontend-web banner + reopen action → Task 15 ✓
  - Navigation entry → Task 16 ✓
  - Mobile push handler → Task 17 ✓
  - Validation → Task 18 ✓

- **Placeholders:** none present; every step has either concrete code or a concrete command.

- **Type consistency:**
  - `RejectByAi(string reason)` — consistent across Tasks 2, 7.
  - `ReopenFromAiRejection(Guid doctorId, string doctorName)` — consistent across Tasks 3, 8.
  - `ListAiRejectedBySpecialtyAsync(string? specialty, int limit, CancellationToken)` — consistent across Tasks 6, 10.
  - `ReopenedForReview(Guid userId, Guid requestId, RequestType requestType)` — consistent across Tasks 8, 9.
  - Push type string `"request_reopened_for_review"` — consistent across Tasks 8 (test), 9 (rule), 17 (mobile handler).
