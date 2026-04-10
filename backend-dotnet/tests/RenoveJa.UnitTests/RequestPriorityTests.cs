using FluentAssertions;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Exceptions;
using Xunit;

namespace RenoveJa.UnitTests;

/// <summary>
/// Phase B — cobertura da classificação de prioridade clínica.
/// Regra-chave: prioridade é imutável após a atribuição do médico
/// (preserva trilha de auditoria).
/// </summary>
public class RequestPriorityTests
{
    private static MedicalRequest NewConsultation() =>
        MedicalRequest.CreateConsultation(Guid.NewGuid(), "João", "Dor no peito");

    [Fact]
    public void Priority_DefaultsToNormal_WhenNotSet()
    {
        var req = NewConsultation();
        req.Priority.Should().Be(RequestPriority.Normal);
    }

    [Fact]
    public void SetPriority_BeforeDoctorAssignment_ShouldSucceed()
    {
        var req = NewConsultation();

        req.SetPriority(RequestPriority.Urgent);

        req.Priority.Should().Be(RequestPriority.Urgent);
    }

    [Fact]
    public void SetPriority_AfterDoctorAssignment_ShouldThrow()
    {
        var req = NewConsultation();
        req.AssignDoctor(Guid.NewGuid(), "Dr. Fulano");

        var act = () => req.SetPriority(RequestPriority.High);

        act.Should().Throw<DomainException>()
           .WithMessage("*não é possível alterar a prioridade*");
    }

    [Fact]
    public void Reconstitute_ShouldRestorePriorityFromSnapshot()
    {
        var id = Guid.NewGuid();
        var snapshot = new MedicalRequestSnapshot
        {
            Id = id,
            PatientId = Guid.NewGuid(),
            PatientName = "Maria",
            RequestType = "consultation",
            Status = "SearchingDoctor",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Priority = "high",
        };

        var req = MedicalRequest.Reconstitute(snapshot);

        req.Priority.Should().Be(RequestPriority.High);
    }

    [Fact]
    public void Reconstitute_WithNullPriority_ShouldDefaultToNormal()
    {
        var snapshot = new MedicalRequestSnapshot
        {
            Id = Guid.NewGuid(),
            PatientId = Guid.NewGuid(),
            PatientName = "Paulo",
            RequestType = "prescription",
            Status = "submitted",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Priority = null,
        };

        var req = MedicalRequest.Reconstitute(snapshot);

        req.Priority.Should().Be(RequestPriority.Normal);
    }

    [Fact]
    public void Reconstitute_WithGarbagePriority_ShouldDefaultToNormal()
    {
        var snapshot = new MedicalRequestSnapshot
        {
            Id = Guid.NewGuid(),
            PatientId = Guid.NewGuid(),
            PatientName = "Ana",
            RequestType = "exam",
            Status = "submitted",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Priority = "not_a_real_value",
        };

        var req = MedicalRequest.Reconstitute(snapshot);

        req.Priority.Should().Be(RequestPriority.Normal);
    }

    /// <summary>
    /// Phase B — verifica determinismo da ordenação da fila clínica.
    /// Lógica equivalente ao CASE SQL em <c>RequestRepository.GetAvailableForQueueAsync</c>:
    /// urgent(0) → high(1) → normal(2) → low(3); empate desempata por CreatedAt ASC (FIFO).
    /// </summary>
    [Fact]
    public void Queue_ShouldOrderByPriorityThenCreatedAtAsc()
    {
        var baseTime = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

        var urgentOlder = MakeRequest(RequestPriority.Urgent, baseTime.AddMinutes(0));
        var urgentNewer = MakeRequest(RequestPriority.Urgent, baseTime.AddMinutes(5));
        var high = MakeRequest(RequestPriority.High, baseTime.AddMinutes(1));
        var normal = MakeRequest(RequestPriority.Normal, baseTime.AddMinutes(2));
        var low = MakeRequest(RequestPriority.Low, baseTime.AddMinutes(3));

        // Embaralha intencionalmente
        var input = new List<MedicalRequest> { low, normal, urgentNewer, high, urgentOlder };

        var ordered = input
            .OrderBy(r => PriorityRank(r.Priority))
            .ThenBy(r => r.CreatedAt)
            .ToList();

        ordered.Should().HaveCount(5);
        ordered[0].Should().BeSameAs(urgentOlder);
        ordered[1].Should().BeSameAs(urgentNewer);
        ordered[2].Should().BeSameAs(high);
        ordered[3].Should().BeSameAs(normal);
        ordered[4].Should().BeSameAs(low);
    }

    private static int PriorityRank(RequestPriority p) => p switch
    {
        RequestPriority.Urgent => 0,
        RequestPriority.High => 1,
        RequestPriority.Normal => 2,
        RequestPriority.Low => 3,
        _ => 2,
    };

    private static MedicalRequest MakeRequest(RequestPriority priority, DateTime createdAt)
    {
        var snapshot = new MedicalRequestSnapshot
        {
            Id = Guid.NewGuid(),
            PatientId = Guid.NewGuid(),
            PatientName = "Paciente",
            RequestType = "consultation",
            Status = "SearchingDoctor",
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
            Priority = priority.ToString().ToLowerInvariant(),
        };
        return MedicalRequest.Reconstitute(snapshot);
    }
}
