using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using RenoveJa.Application.DTOs.Consultation;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.Evidence;

/// <summary>
/// Agrega evidências de PubMed, Europe PMC e Semantic Scholar em paralelo.
/// Deduplica por PMID e limita o total para evitar sobrecarga na IA.
/// </summary>
public class UnifiedEvidenceSearchService : IEvidenceSearchService
{
    private static readonly Regex PMIDRegex = new(@"PMID:(\d+)", RegexOptions.Compiled);

    private readonly IPubMedService _pubmedService;
    private readonly EuropePmcEvidenceService _europePmcService;
    private readonly SemanticScholarEvidenceService _semanticScholarService;
    private readonly ILogger<UnifiedEvidenceSearchService> _logger;

    public UnifiedEvidenceSearchService(
        IPubMedService pubmedService,
        EuropePmcEvidenceService europePmcService,
        SemanticScholarEvidenceService semanticScholarService,
        ILogger<UnifiedEvidenceSearchService> logger)
    {
        _pubmedService = pubmedService;
        _europePmcService = europePmcService;
        _semanticScholarService = semanticScholarService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<EvidenceItemDto>> SearchAsync(
        IReadOnlyList<string> searchTerms,
        int maxResults = 7,
        CancellationToken cancellationToken = default)
    {
        if (searchTerms == null || searchTerms.Count == 0)
            return Array.Empty<EvidenceItemDto>();

        var perSource = Math.Max(2, (maxResults + 2) / 3);

        var pubmedTask = _pubmedService.SearchAsync(searchTerms, perSource, cancellationToken);
        var europePmcTask = _europePmcService.SearchAsync(searchTerms, perSource, cancellationToken);
        var semanticTask = _semanticScholarService.SearchAsync(searchTerms, perSource, cancellationToken);

        await Task.WhenAll(pubmedTask, europePmcTask, semanticTask);

        var pubmed = await pubmedTask;
        var europePmc = await europePmcTask;
        var semantic = await semanticTask;

        var seenPmids = new ConcurrentDictionary<string, byte>();
        var result = new List<EvidenceItemDto>();

        void AddIfNew(EvidenceItemDto item)
        {
            if (result.Count >= maxResults) return;
            var pmid = ExtractPmid(item.Source);
            if (!string.IsNullOrEmpty(pmid) && !seenPmids.TryAdd(pmid, 0))
                return;
            result.Add(item);
        }

        var idx = 0;
        var maxLen = Math.Max(pubmed.Count, Math.Max(europePmc.Count, semantic.Count));
        while (result.Count < maxResults && idx < maxLen)
        {
            if (idx < pubmed.Count) AddIfNew(pubmed[idx]);
            if (idx < europePmc.Count) AddIfNew(europePmc[idx]);
            if (idx < semantic.Count) AddIfNew(semantic[idx]);
            idx++;
        }

        return result;
    }

    private static string? ExtractPmid(string source)
    {
        var m = PMIDRegex.Match(source ?? "");
        return m.Success ? m.Groups[1].Value : null;
    }
}
