using RenoveJa.Application.DTOs.Rh;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Serviço de IA para o painel de RH (geração de bio e análise de candidatos).
/// </summary>
public interface IRhAiService
{
    /// <summary>Gera bio profissional para o candidato.</summary>
    Task<string?> GenerateBioAsync(RhGenerateBioRequest input, CancellationToken ct = default);

    /// <summary>Analisa candidato com base em seu perfil.</summary>
    Task<RhCandidateAnalysis?> AnalyzeCandidateAsync(RhAnalyzeCandidateRequest input, CancellationToken ct = default);
}
