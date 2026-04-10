using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Exceptions;

namespace RenoveJa.Domain.Entities;

public class CarePlan : AggregateRoot
{
    public Guid ConsultationId { get; private set; }
    public Guid PatientId { get; private set; }
    public Guid ResponsibleDoctorId { get; private set; }
    public CarePlanStatus Status { get; private set; }
    public Guid CreatedFromAiSuggestionId { get; private set; }
    public string? CorrelationId { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? ClosedAt { get; private set; }

    private CarePlan() : base() { }

    private CarePlan(
        Guid id,
        Guid consultationId,
        Guid patientId,
        Guid responsibleDoctorId,
        CarePlanStatus status,
        Guid createdFromAiSuggestionId,
        string? correlationId,
        DateTime createdAt,
        DateTime updatedAt,
        DateTime? closedAt) : base(id, createdAt)
    {
        ConsultationId = consultationId;
        PatientId = patientId;
        ResponsibleDoctorId = responsibleDoctorId;
        Status = status;
        CreatedFromAiSuggestionId = createdFromAiSuggestionId;
        CorrelationId = correlationId;
        UpdatedAt = updatedAt;
        ClosedAt = closedAt;
    }

    public static CarePlan Create(
        Guid consultationId,
        Guid patientId,
        Guid responsibleDoctorId,
        Guid createdFromAiSuggestionId,
        string? correlationId)
    {
        if (consultationId == Guid.Empty) throw new DomainException("ConsultationId is required");
        if (patientId == Guid.Empty) throw new DomainException("PatientId is required");
        if (responsibleDoctorId == Guid.Empty) throw new DomainException("ResponsibleDoctorId is required");
        if (createdFromAiSuggestionId == Guid.Empty) throw new DomainException("AiSuggestionId is required");

        return new CarePlan(
            Guid.NewGuid(),
            consultationId,
            patientId,
            responsibleDoctorId,
            CarePlanStatus.Active,
            createdFromAiSuggestionId,
            correlationId,
            DateTime.UtcNow,
            DateTime.UtcNow,
            null);
    }

    public static CarePlan Reconstitute(
        Guid id,
        Guid consultationId,
        Guid patientId,
        Guid responsibleDoctorId,
        string status,
        Guid createdFromAiSuggestionId,
        string? correlationId,
        DateTime createdAt,
        DateTime updatedAt,
        DateTime? closedAt)
    {
        var parsedStatus = Enum.TryParse<CarePlanStatus>(status, true, out var s)
            ? s
            : CarePlanStatus.Active;

        return new CarePlan(
            id,
            consultationId,
            patientId,
            responsibleDoctorId,
            parsedStatus,
            createdFromAiSuggestionId,
            correlationId,
            createdAt,
            updatedAt,
            closedAt);
    }

    public void MarkWaitingPatient()
    {
        if (Status != CarePlanStatus.Active) return;
        Status = CarePlanStatus.WaitingPatient;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkWaitingResults()
    {
        if (Status is CarePlanStatus.WaitingPatient or CarePlanStatus.Active)
        {
            Status = CarePlanStatus.WaitingResults;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void MarkReadyForReview()
    {
        if (Status is not (CarePlanStatus.WaitingResults or CarePlanStatus.WaitingPatient))
            throw new DomainException("CarePlan must be waiting for patient/results");
        Status = CarePlanStatus.ReadyForReview;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Close()
    {
        if (Status == CarePlanStatus.Closed) return;
        Status = CarePlanStatus.Closed;
        ClosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Escalate()
    {
        Status = CarePlanStatus.Escalated;
        UpdatedAt = DateTime.UtcNow;
    }
}
