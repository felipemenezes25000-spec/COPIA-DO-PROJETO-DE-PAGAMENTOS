using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Exceptions;

namespace RenoveJa.Domain.Entities;

public class AiSuggestion : AggregateRoot
{
    public Guid ConsultationId { get; private set; }
    public Guid PatientId { get; private set; }
    public Guid? DoctorId { get; private set; }
    public string Type { get; private set; } = "exam_suggestion";
    public AiSuggestionStatus Status { get; private set; }
    public string Model { get; private set; } = string.Empty;
    public string PayloadJson { get; private set; } = "{}";
    public string PayloadHash { get; private set; } = string.Empty;
    public string? CorrelationId { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private AiSuggestion() : base() { }

    private AiSuggestion(
        Guid id,
        Guid consultationId,
        Guid patientId,
        Guid? doctorId,
        string model,
        string payloadJson,
        string payloadHash,
        string? correlationId,
        AiSuggestionStatus status,
        DateTime createdAt,
        DateTime updatedAt) : base(id, createdAt)
    {
        ConsultationId = consultationId;
        PatientId = patientId;
        DoctorId = doctorId;
        Model = model;
        PayloadJson = payloadJson;
        PayloadHash = payloadHash;
        CorrelationId = correlationId;
        Status = status;
        UpdatedAt = updatedAt;
    }

    public static AiSuggestion Create(
        Guid consultationId,
        Guid patientId,
        Guid? doctorId,
        string model,
        string payloadJson,
        string payloadHash,
        string? correlationId)
    {
        if (consultationId == Guid.Empty) throw new DomainException("ConsultationId is required");
        if (patientId == Guid.Empty) throw new DomainException("PatientId is required");
        if (string.IsNullOrWhiteSpace(model)) throw new DomainException("Model is required");
        if (string.IsNullOrWhiteSpace(payloadJson)) throw new DomainException("PayloadJson is required");
        if (string.IsNullOrWhiteSpace(payloadHash)) throw new DomainException("PayloadHash is required");

        return new AiSuggestion(
            Guid.NewGuid(),
            consultationId,
            patientId,
            doctorId,
            model.Trim(),
            payloadJson,
            payloadHash,
            correlationId,
            AiSuggestionStatus.Generated,
            DateTime.UtcNow,
            DateTime.UtcNow);
    }

    public static AiSuggestion Reconstitute(
        Guid id,
        Guid consultationId,
        Guid patientId,
        Guid? doctorId,
        string type,
        string status,
        string model,
        string payloadJson,
        string payloadHash,
        string? correlationId,
        DateTime createdAt,
        DateTime updatedAt)
    {
        var parsedStatus = Enum.TryParse<AiSuggestionStatus>(status, true, out var s)
            ? s
            : AiSuggestionStatus.Generated;

        var entity = new AiSuggestion(
            id,
            consultationId,
            patientId,
            doctorId,
            model,
            payloadJson,
            payloadHash,
            correlationId,
            parsedStatus,
            createdAt,
            updatedAt);
        entity.Type = string.IsNullOrWhiteSpace(type) ? "exam_suggestion" : type;
        return entity;
    }

    public void MarkReviewed()
    {
        if (Status != AiSuggestionStatus.Generated) return;
        Status = AiSuggestionStatus.Reviewed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkApproved()
    {
        if (Status is not (AiSuggestionStatus.Generated or AiSuggestionStatus.Reviewed))
            throw new DomainException("Only generated/reviewed suggestion can be approved");
        Status = AiSuggestionStatus.Approved;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkRejected()
    {
        if (Status is not (AiSuggestionStatus.Generated or AiSuggestionStatus.Reviewed))
            throw new DomainException("Only generated/reviewed suggestion can be rejected");
        Status = AiSuggestionStatus.Rejected;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkSuperseded()
    {
        Status = AiSuggestionStatus.Superseded;
        UpdatedAt = DateTime.UtcNow;
    }
}
