namespace RenoveJa.Application.DTOs.Clinical;

/// <summary>
/// Termo médico extraído pela IA durante a geração de notas SOAP.
/// </summary>
public record MedicalTerm(
    string Term,
    string Category,
    string? IcdCode = null);

/// <summary>
/// Resultado da geração de notas SOAP (Subjective, Objective, Assessment, Plan).
/// </summary>
public record SoapNotesResult(
    string Subjective,
    string Objective,
    string Assessment,
    string Plan,
    List<MedicalTerm> MedicalTerms,
    string RawJson);
