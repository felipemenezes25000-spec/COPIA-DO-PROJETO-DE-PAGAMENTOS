using RenoveJa.Application.DTOs.Consultation;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Serviço unificado para buscar evidências científicas em múltiplas fontes (PubMed, Europe PMC, Semantic Scholar).
/// </summary>
public interface IEvidenceSearchService
{
    /// <summary>
    /// Busca artigos em PubMed, Europe PMC e Semantic Scholar, deduplica e retorna até maxResults itens.
    /// </summary>
    Task<IReadOnlyList<EvidenceItemDto>> SearchAsync(
        IReadOnlyList<string> searchTerms,
        int maxResults = 7,
        CancellationToken cancellationToken = default);
}
