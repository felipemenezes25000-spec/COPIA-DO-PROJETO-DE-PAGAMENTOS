using System.Text.Json;
using Microsoft.Extensions.Logging;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.RxNorm;

/// <summary>
/// Integração com RxNorm (NLM) para validação e normalização de medicamentos.
/// API: https://rxnav.nlm.nih.gov/
/// Usado para enriquecer medicamentos sugeridos pela IA com dados padronizados.
/// </summary>
public class RxNormService : IRxNormService
{
    private const string ApiBase = "https://rxnav.nlm.nih.gov/REST/Prescribe";
    private const string UserAgent = "RenoveJaPlus/1.0 (Medical decision support; https://renovejasaude.com.br)";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<RxNormService> _logger;

    public RxNormService(IHttpClientFactory httpClientFactory, ILogger<RxNormService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<RxNormResult?> FindByDrugNameAsync(string drugName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(drugName) || drugName.Length < 2)
            return new RxNormResult(null, null, false);

        var name = drugName.Trim();
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        client.Timeout = TimeSpan.FromSeconds(5);

        try
        {
            var url = $"{ApiBase}/rxcui.json?name={Uri.EscapeDataString(name)}";
            using var response = await client.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("RxNorm rxcui.json failed: {StatusCode} for {Name}", response.StatusCode, name);
                return new RxNormResult(null, null, false);
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseRxcuiResponse(json, name);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "RxNorm search failed for {Name}", name);
            return new RxNormResult(null, null, false);
        }
    }

    private static RxNormResult? ParseRxcuiResponse(string json, string originalName)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("idGroup", out var idGroup))
                return new RxNormResult(null, null, false);

            var rxcui = "";
            if (idGroup.TryGetProperty("rxnormId", out var ids) && ids.ValueKind == JsonValueKind.Array)
            {
                var first = ids.EnumerateArray().FirstOrDefault();
                rxcui = first.GetString() ?? "";
            }
            if (string.IsNullOrEmpty(rxcui) && idGroup.TryGetProperty("rxnormId", out var singleId))
                rxcui = singleId.GetString() ?? "";

            if (string.IsNullOrEmpty(rxcui))
                return new RxNormResult(null, null, false);

            return new RxNormResult(rxcui, originalName, true);
        }
        catch
        {
            return new RxNormResult(null, null, false);
        }
    }

}
