using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using RenoveJa.Application.DTOs.Consultation;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.Evidence;

/// <summary>
/// Agrega evidências de PubMed, Europe PMC, Semantic Scholar e ClinicalTrials.gov em paralelo.
/// Deduplica por PMID e limita o total para evitar sobrecarga na IA.
/// Garante uso das principais fontes: artigos (PubMed, Europe PMC, Semantic Scholar) + ensaios clínicos.
/// </summary>
public class UnifiedEvidenceSearchService : IEvidenceSearchService
{
    private static readonly Regex PMIDRegex = new(@"PMID:(\d+)", RegexOptions.Compiled);
    private static readonly Regex NctRegex = new(@"NCT\d+", RegexOptions.Compiled);

    private readonly IPubMedService _pubmedService;
    private readonly EuropePmcEvidenceService _europePmcService;
    private readonly SemanticScholarEvidenceService _semanticScholarService;
    private readonly ClinicalTrialsEvidenceService _clinicalTrialsService;
    private readonly ILogger<UnifiedEvidenceSearchService> _logger;

    public UnifiedEvidenceSearchService(
        IPubMedService pubmedService,
        EuropePmcEvidenceService europePmcService,
        SemanticScholarEvidenceService semanticScholarService,
        ClinicalTrialsEvidenceService clinicalTrialsService,
        ILogger<UnifiedEvidenceSearchService> logger)
    {
        _pubmedService = pubmedService;
        _europePmcService = europePmcService;
        _semanticScholarService = semanticScholarService;
        _clinicalTrialsService = clinicalTrialsService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<EvidenceItemDto>> SearchAsync(
        IReadOnlyList<string> searchTerms,
        int maxResults = 7,
        CancellationToken cancellationToken = default)
    {
        if (searchTerms == null || searchTerms.Count == 0)
            return Array.Empty<EvidenceItemDto>();

        var perSource = Math.Max(2, (maxResults + 3) / 4);

        var pubmedTask = _pubmedService.SearchAsync(searchTerms, perSource, cancellationToken);
        var europePmcTask = _europePmcService.SearchAsync(searchTerms, perSource, cancellationToken);
        var semanticTask = _semanticScholarService.SearchAsync(searchTerms, perSource, cancellationToken);
        var clinicalTrialsTask = _clinicalTrialsService.SearchAsync(searchTerms, perSource, cancellationToken);

        await Task.WhenAll(pubmedTask, europePmcTask, semanticTask, clinicalTrialsTask);

        var pubmed = await pubmedTask;
        var europePmc = await europePmcTask;
        var semantic = await semanticTask;
        var clinicalTrials = await clinicalTrialsTask;

        var seenPmids = new ConcurrentDictionary<string, byte>();
        var seenNcts = new ConcurrentDictionary<string, byte>();
        var result = new List<EvidenceItemDto>();

        void AddIfNew(EvidenceItemDto item)
        {
            if (result.Count >= maxResults) return;
            var pmid = ExtractPmid(item.Source);
            var nct = ExtractNct(item.Source);
            if (!string.IsNullOrEmpty(pmid) && !seenPmids.TryAdd(pmid, 0))
                return;
            if (!string.IsNullOrEmpty(nct) && !seenNcts.TryAdd(nct, 0))
                return;
            result.Add(item);
        }

        var idx = 0;
        var maxLen = Math.Max(Math.Max(pubmed.Count, europePmc.Count), Math.Max(semantic.Count, clinicalTrials.Count));
        while (result.Count < maxResults && idx < maxLen)
        {
            if (idx < pubmed.Count) AddIfNew(pubmed[idx]);
            if (idx < europePmc.Count) AddIfNew(europePmc[idx]);
            if (idx < semantic.Count) AddIfNew(semantic[idx]);
            if (idx < clinicalTrials.Count) AddIfNew(clinicalTrials[idx]);
            idx++;
        }

        return result;
    }

    private static string? ExtractNct(string? source)
    {
        if (string.IsNullOrEmpty(source)) return null;
        var m = NctRegex.Match(source);
        return m.Success ? m.Value : null;
    }

    private static string? ExtractPmid(string source)
    {
        var m = PMIDRegex.Match(source ?? "");
        return m.Success ? m.Groups[1].Value : null;
    }
}
