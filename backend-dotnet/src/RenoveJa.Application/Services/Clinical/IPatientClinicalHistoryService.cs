using RenoveJa.Application.Interfaces;

namespace RenoveJa.Application.Services.Clinical;

/// <summary>
/// Resultado agregado do histórico clínico: pronto para alimentar IClinicalSummaryService
/// ou ser serializado de volta para o cliente em fluxos de fallback.
/// </summary>
public record PatientClinicalHistoryResult(
    bool IsEmpty,
    string PatientName,
    DateTime? BirthDate,
    string? Gender,
    IReadOnlyList<string> Allergies,
    IReadOnlyList<ClinicalSummaryConsultation> Consultations,
    IReadOnlyList<ClinicalSummaryPrescription> Prescriptions,
    IReadOnlyList<ClinicalSummaryExam> Exams)
{
    public ClinicalSummaryInput ToSummaryInput() => new(
        PatientName,
        BirthDate,
        Gender,
        Allergies,
        Consultations,
        Prescriptions,
        Exams);
}

/// <summary>
/// Extrai do prontuário do paciente a estrutura necessária para gerar resumo clínico:
/// consultas, receitas, exames e alergias. Centraliza o parsing do JSON de anamnese
/// (queixa, HDA, medicações, CID) que antes ficava inline no ClinicalRecordsController.
/// </summary>
public interface IPatientClinicalHistoryService
{
    Task<PatientClinicalHistoryResult> BuildAsync(
        Guid doctorId,
        Guid patientId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Constrói um resumo textual de fallback quando a IA não está disponível.
    /// Determinístico, sem dependências externas.
    /// </summary>
    string BuildFallbackSummary(PatientClinicalHistoryResult history);
}
