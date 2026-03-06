using System.Text.Json;
using Microsoft.Extensions.Logging;
using RenoveJa.Application.DTOs.Consultation;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.Evidence;

/// <summary>
/// Busca artigos no Semantic Scholar (IA para literatura acadêmica).
/// API gratuita: https://api.semanticscholar.org/
/// </summary>
public class SemanticScholarEvidenceService : IEvidenceSearchService
{
    private const string ApiBase = "https://api.semanticscholar.org/graph/v1";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SemanticScholarEvidenceService> _logger;

    public SemanticScholarEvidenceService(IHttpClientFactory httpClientFactory, ILogger<SemanticScholarEvidenceService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IReadOnlyList<EvidenceItemDto>> SearchAsync(
        IReadOnlyList<string> searchTerms,
        int maxResults = 7,
        CancellationToken cancellationToken = default)
    {
        if (searchTerms == null || searchTerms.Count == 0)
            return Array.Empty<EvidenceItemDto>();

        var query = string.Join(" ", searchTerms.Where(s => !string.IsNullOrWhiteSpace(s)).Take(5));
        if (string.IsNullOrWhiteSpace(query))
            return Array.Empty<EvidenceItemDto>();

        var url = $"{ApiBase}/paper/search?query={Uri.EscapeDataString(query)}&limit={Math.Min(maxResults, 5)}&fields=title,abstract,externalIds";
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(15);

        try
        {
            var response = await client.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Semantic Scholar search failed: {StatusCode}", response.StatusCode);
                return Array.Empty<EvidenceItemDto>();
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseResponse(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Semantic Scholar search failed for query: {Query}", query);
            return Array.Empty<EvidenceItemDto>();
        }
    }

    private static IReadOnlyList<EvidenceItemDto> ParseResponse(string json)
    {
        var items = new List<EvidenceItemDto>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
                return items;

            foreach (var p in data.EnumerateArray())
            {
                var title = p.TryGetProperty("title", out var t) ? t.GetString()?.Trim() ?? "" : "";
                var abstractText = p.TryGetProperty("abstract", out var a) ? a.GetString()?.Trim() ?? "" : "";
                if (string.IsNullOrEmpty(abstractText))
                    abstractText = "(Resumo não disponível)";

                var paperId = p.TryGetProperty("paperId", out var pid) ? pid.GetString() ?? "" : "";
                var pmid = "";
                if (p.TryGetProperty("externalIds", out var ext) && ext.TryGetProperty("PubMed", out var pmEl))
                    pmid = pmEl.GetString() ?? "";

                var source = !string.IsNullOrEmpty(pmid)
                    ? $"Semantic Scholar PMID:{pmid}"
                    : !string.IsNullOrEmpty(paperId)
                        ? $"Semantic Scholar"
                        : "Semantic Scholar";

                items.Add(new EvidenceItemDto(title, abstractText, source, null, Provider: EvidenceProvider.SemanticScholar));
            }
        }
        catch (Exception) { /* ignore */ }
        return items;
    }
}
