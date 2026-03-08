using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using RenoveJa.Application.DTOs.Consultation;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.Evidence;

/// <summary>
/// Busca ensaios clínicos no ClinicalTrials.gov (API v2).
/// Complementa artigos científicos com evidências de estudos em andamento/concluídos.
/// API gratuita: https://clinicaltrials.gov/data-api/api
/// </summary>
public class ClinicalTrialsEvidenceService : IEvidenceSearchService
{
    private const string ApiBase = "https://clinicaltrials.gov/api/v2";
    private const string UserAgent = "RenoveJaPlus/1.0 (Medical decision support; https://renovejasaude.com.br)";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ClinicalTrialsEvidenceService> _logger;

    public ClinicalTrialsEvidenceService(IHttpClientFactory httpClientFactory, ILogger<ClinicalTrialsEvidenceService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IReadOnlyList<EvidenceItemDto>> SearchAsync(
        IReadOnlyList<string> searchTerms,
        int maxResults = 5,
        CancellationToken cancellationToken = default)
    {
        if (searchTerms == null || searchTerms.Count == 0)
            return Array.Empty<EvidenceItemDto>();

        var query = string.Join(" ", searchTerms.Where(s => !string.IsNullOrWhiteSpace(s)).Take(5));
        if (string.IsNullOrWhiteSpace(query))
            return Array.Empty<EvidenceItemDto>();

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        client.Timeout = TimeSpan.FromSeconds(15);

        try
        {
            var url = $"{ApiBase}/studies?query.cond={Uri.EscapeDataString(query)}&pageSize={Math.Min(maxResults, 10)}&format=json";
            var response = await client.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("ClinicalTrials.gov search failed: {StatusCode}", response.StatusCode);
                return Array.Empty<EvidenceItemDto>();
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseResponse(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ClinicalTrials.gov search failed for query: {Query}", query);
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
            if (!root.TryGetProperty("studies", out var studies) || studies.ValueKind != JsonValueKind.Array)
                return items;

            foreach (var s in studies.EnumerateArray())
            {
                var protocol = s.TryGetProperty("protocolSection", out var ps) ? ps : default;
                var idModule = protocol.TryGetProperty("identificationModule", out var im) ? im : default;
                var descModule = protocol.TryGetProperty("descriptionModule", out var dm) ? dm : default;

                var nctId = idModule.TryGetProperty("nctId", out var nct) ? nct.GetString()?.Trim() ?? "" : "";
                var title = idModule.TryGetProperty("briefTitle", out var bt) ? bt.GetString()?.Trim() ?? "" : "";
                if (string.IsNullOrEmpty(title) && idModule.TryGetProperty("officialTitle", out var ot))
                    title = ot.GetString()?.Trim() ?? "";

                var desc = descModule.TryGetProperty("briefSummary", out var bs) ? bs.GetString()?.Trim() ?? "" : "";
                if (string.IsNullOrEmpty(desc) && descModule.TryGetProperty("detailedDescription", out var dd))
                    desc = dd.GetString()?.Trim() ?? "";
                if (string.IsNullOrEmpty(desc))
                    desc = "(Descrição não disponível)";

                var source = string.IsNullOrEmpty(nctId) ? "ClinicalTrials.gov" : $"ClinicalTrials.gov {nctId}";
                var url = string.IsNullOrEmpty(nctId) ? null : $"https://clinicaltrials.gov/study/{nctId}";

                items.Add(new EvidenceItemDto(title, desc, source, null, Provider: EvidenceProvider.ClinicalTrials, Url: url));
            }
        }
        catch (Exception) { /* ignore */ }
        return items;
    }
}
