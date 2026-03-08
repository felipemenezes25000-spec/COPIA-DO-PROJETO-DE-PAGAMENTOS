using System.Text.Json;
using Microsoft.Extensions.Logging;
using RenoveJa.Application.DTOs.Consultation;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.Evidence;

/// <summary>
/// Busca artigos no Europe PMC (33M+ publicações: PubMed, Agricola, EPO, NICE).
/// API gratuita: https://www.ebi.ac.uk/europepmc/webservices/rest/
/// </summary>
public class EuropePmcEvidenceService : IEvidenceSearchService
{
    private const string ApiBase = "https://www.ebi.ac.uk/europepmc/webservices/rest";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<EuropePmcEvidenceService> _logger;

    public EuropePmcEvidenceService(IHttpClientFactory httpClientFactory, ILogger<EuropePmcEvidenceService> logger)
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

        var url = $"{ApiBase}/search?query={Uri.EscapeDataString(query)}&format=json&resultType=core&pageSize={Math.Min(maxResults, 10)}";
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(15);

        try
        {
            var response = await client.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Europe PMC search failed: {StatusCode}", response.StatusCode);
                return Array.Empty<EvidenceItemDto>();
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseResponse(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Europe PMC search failed for query: {Query}", query);
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
            if (!root.TryGetProperty("resultList", out var resultList) ||
                !resultList.TryGetProperty("result", out var results) ||
                results.ValueKind != JsonValueKind.Array)
                return items;

            foreach (var r in results.EnumerateArray())
            {
                var title = r.TryGetProperty("title", out var t) ? t.GetString()?.Trim() ?? "" : "";
                var abstractText = r.TryGetProperty("abstractText", out var a) ? a.GetString()?.Trim() ?? "" : "";
                if (string.IsNullOrEmpty(abstractText))
                    abstractText = "(Resumo não disponível)";

                var pmid = r.TryGetProperty("pmid", out var p) ? p.GetString() ?? "" : "";
                var pmcid = r.TryGetProperty("pmcid", out var pc) ? pc.GetString() ?? "" : "";
                var source = !string.IsNullOrEmpty(pmid)
                    ? $"Europe PMC PMID:{pmid}"
                    : !string.IsNullOrEmpty(pmcid)
                        ? $"Europe PMC {pmcid}"
                        : "Europe PMC";
                var url = !string.IsNullOrEmpty(pmid)
                    ? $"https://europepmc.org/article/MED/{pmid}"
                    : !string.IsNullOrEmpty(pmcid)
                        ? $"https://europepmc.org/article/{pmcid}"
                        : null;

                items.Add(new EvidenceItemDto(title, abstractText, source, null, Provider: EvidenceProvider.EuropePmc, Url: url));
            }
        }
        catch (Exception) { /* ignore */ }
        return items;
    }
}
