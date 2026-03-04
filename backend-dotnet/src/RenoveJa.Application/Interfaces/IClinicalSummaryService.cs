namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Entrada para geração do resumo clínico completo do paciente.
/// </summary>
public record ClinicalSummaryInput(
    string PatientName,
    DateTime? PatientBirthDate,
    string? PatientGender,
    IReadOnlyList<string> Allergies,
    IReadOnlyList<ClinicalSummaryConsultation> Consultations,
    IReadOnlyList<ClinicalSummaryPrescription> Prescriptions,
    IReadOnlyList<ClinicalSummaryExam> Exams);

public record ClinicalSummaryConsultation(
    DateTime Date,
    string? Symptoms,
    string? Cid,
    string? Conduct,
    string? AnamnesisSnippet);

public record ClinicalSummaryPrescription(
    DateTime Date,
    string Type,
    IReadOnlyList<string> Medications,
    string? Notes);

public record ClinicalSummaryExam(
    DateTime Date,
    string? ExamType,
    IReadOnlyList<string> Exams,
    string? Symptoms,
    string? Notes);

/// <summary>
/// Gera resumo narrativo completo do prontuário do paciente com IA.
/// Consolida consultas, receitas e exames em um texto único para o médico.
/// </summary>
public interface IClinicalSummaryService
{
    Task<string?> GenerateAsync(
        ClinicalSummaryInput input,
        CancellationToken cancellationToken = default);
}
