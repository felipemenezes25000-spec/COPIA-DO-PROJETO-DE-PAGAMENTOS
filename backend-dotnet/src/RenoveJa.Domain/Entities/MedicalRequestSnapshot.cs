namespace RenoveJa.Domain.Entities;

/// <summary>
/// Immutable snapshot used to reconstitute a <see cref="MedicalRequest"/> from persistence.
/// Every property maps 1-to-1 with a <see cref="MedicalRequest.Reconstitute"/> parameter.
/// </summary>
public record MedicalRequestSnapshot
{
    public required Guid Id { get; init; }
    public required Guid PatientId { get; init; }
    public string? PatientName { get; init; }
    public Guid? DoctorId { get; init; }
    public string? DoctorName { get; init; }
    public required string RequestType { get; init; }
    public required string Status { get; init; }
    public string? PrescriptionType { get; init; }
    public List<string>? Medications { get; init; }
    public List<string>? PrescriptionImages { get; init; }
    public string? ExamType { get; init; }
    public List<string>? Exams { get; init; }
    public List<string>? ExamImages { get; init; }
    public string? Symptoms { get; init; }
    public string? Notes { get; init; }
    public string? RejectionReason { get; init; }
    public DateTime? SignedAt { get; init; }
    public string? SignedDocumentUrl { get; init; }
    public string? SignatureId { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public string? AiSummaryForDoctor { get; init; }
    public string? AiExtractedJson { get; init; }
    public string? AiRiskLevel { get; init; }
    public string? AiUrgency { get; init; }
    public bool? AiReadabilityOk { get; init; }
    public string? AiMessageToUser { get; init; }
    public string? AccessCode { get; init; }
    public string? PrescriptionKind { get; init; }
    public string? ConsultationType { get; init; }
    public int? ContractedMinutes { get; init; }
    public DateTime? ConsultationStartedAt { get; init; }
    public DateTime? DoctorCallConnectedAt { get; init; }
    public DateTime? PatientCallConnectedAt { get; init; }
    public string? AutoObservation { get; init; }
    public string? DoctorConductNotes { get; init; }
    public bool? IncludeConductInPdf { get; init; }
    public string? AiConductSuggestion { get; init; }
    public string? AiSuggestedExams { get; init; }
    public DateTime? ConductUpdatedAt { get; init; }
    public Guid? ConductUpdatedBy { get; init; }

    /// <summary>
    /// Especialidade médica exigida para atender a solicitação (display name, ex.: "Cardiologia").
    /// Quando null, qualquer médico aprovado e disponível pode atender.
    /// Usado pelo roteamento de fila para evitar que caso cardiológico caia com dermatologista.
    /// </summary>
    public string? RequiredSpecialty { get; init; }

    /// <summary>
    /// Prioridade clínica da solicitação (low/normal/high/urgent). Default: normal.
    /// Usada no ORDER BY da fila para fazer urgências saírem antes.
    /// </summary>
    public string? Priority { get; init; }

    /// <summary>
    /// "Doctor" ou "Ai". Null para pedidos rejeitados antes da introdução deste campo (legado).
    /// </summary>
    public string? RejectionSource { get; init; }
    public string? AiRejectionReason { get; init; }
    public DateTime? AiRejectedAt { get; init; }
    public Guid? ReopenedBy { get; init; }
    public DateTime? ReopenedAt { get; init; }
    public DateTime? ClaimedAt { get; init; }
}
