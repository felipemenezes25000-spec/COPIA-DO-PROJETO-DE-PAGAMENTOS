using RenoveJa.Application.DTOs.Consultation;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Busca evidências clínicas (Cochrane / PubMed) e valida contra hipótese diagnóstica.
/// </summary>
public interface IClinicalEvidenceService
{
    /// <summary>Busca evidências clínicas relevantes para o diagnóstico.</summary>
    Task<IReadOnlyList<EvidenceItemDto>> SearchEvidenceAsync(
        string anamnesisJson,
        CancellationToken cancellationToken = default);

    /// <summary>Limpa cache de evidências.</summary>
    Task<int> ClearCacheAsync(CancellationToken cancellationToken = default);
}
