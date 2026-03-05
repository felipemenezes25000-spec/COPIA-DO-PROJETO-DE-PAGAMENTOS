namespace RenoveJa.Application.DTOs.Requests;

/// <summary>
/// Resultado da análise por IA de imagem(ns) de receita.
/// HasDoubts: quando true, NÃO rejeitar automaticamente - encaminhar ao médico que decide. A IA documenta as dúvidas no summary.
/// </summary>
public record AiPrescriptionAnalysisResult(
    bool ReadabilityOk,
    string? SummaryForDoctor,
    string? ExtractedJson,
    string? RiskLevel,
    string? MessageToUser,
    string? ExtractedPrescriptionType = null,
    string? ExtractedPatientName = null,
    bool? PatientNameVisible = null,
    bool? PrescriptionTypeVisible = null,
    bool? SignsOfTampering = null,
    bool? HasDoubts = null
);

/// <summary>
/// Resultado da análise por IA de pedido de exame (imagem e/ou texto).
/// Se ReadabilityOk é false (quando houve imagem), o usuário deve enviar imagem mais legível.
/// </summary>
public record AiExamAnalysisResult(
    bool ReadabilityOk,
    string? SummaryForDoctor,
    string? ExtractedJson,
    string? Urgency,
    string? MessageToUser
);
