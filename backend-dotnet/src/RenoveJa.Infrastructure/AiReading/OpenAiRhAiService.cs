using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs.Rh;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.AiReading;

/// <summary>
/// Proxy OpenAI/Gemini para o painel de RH.
/// Mesmo padrão de dual-provider dos outros AI services: OpenAI primário, Gemini fallback.
/// </summary>
public class OpenAiRhAiService : IRhAiService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<OpenAIConfig> _config;
    private readonly ILogger<OpenAiRhAiService> _logger;

    private const string OpenAiBaseUrl = "https://api.openai.com/v1";
    private const string GeminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";

    private static readonly Dictionary<string, string> ExperienceMap = new()
    {
        ["menos_1"] = "menos de 1 ano",
        ["1_3"] = "1 a 3 anos",
        ["3_5"] = "3 a 5 anos",
        ["5_10"] = "5 a 10 anos",
        ["mais_10"] = "mais de 10 anos",
    };

    // Mantém label "humano" para cada categoria que o RH oferece. O frontend
    // (rh-renoveja) tem 4 opcoes — esqueceram dentista aqui originalmente, o
    // que fazia o prompt de "gerar bio" cair no fallback (codigo cru) e gerar
    // texto desalinhado para dentistas.
    private static readonly Dictionary<string, string> CategoryMap = new()
    {
        ["medico"] = "Médico(a)",
        ["enfermeiro"] = "Enfermeiro(a)",
        ["dentista"] = "Dentista",
        ["psicologo"] = "Psicólogo(a)",
        ["nutricionista"] = "Nutricionista",
    };

    public OpenAiRhAiService(
        IHttpClientFactory httpClientFactory,
        IOptions<OpenAIConfig> config,
        ILogger<OpenAiRhAiService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<string?> GenerateBioAsync(RhGenerateBioRequest input, CancellationToken ct = default)
    {
        var systemPrompt = """
            Você é um assistente de RH da RenoveJá+, uma plataforma de telemedicina no Brasil.
            Gere um texto de apresentação profissional curto (3-5 frases, máx 800 caracteres) em primeira pessoa para um profissional de saúde se candidatando a vagas de telemedicina.
            O texto deve ser profissional, acolhedor e destacar os pontos fortes do candidato.
            NÃO invente informações — use apenas o que foi fornecido.
            Responda APENAS com o texto, sem aspas, sem título.
            """;

        var userContent = "Gere uma apresentação profissional com base nesses dados:\n\n" + BuildBioDetails(input);

        var response = await CallChatCompletionAsync(systemPrompt, userContent, temperature: 0.8, maxTokens: 300, jsonMode: false, ct);
        return response?.Trim();
    }

    public async Task<RhCandidateAnalysis?> AnalyzeCandidateAsync(RhAnalyzeCandidateRequest input, CancellationToken ct = default)
    {
        var systemPrompt = """
            Você é o sistema de IA de triagem da RenoveJá+, uma plataforma de telemedicina.
            Analise o perfil do candidato e retorne um JSON (sem markdown) com EXATAMENTE esta estrutura:
            {
              "score": <número 0-100>,
              "resumo": "<2-3 frases resumindo o perfil>",
              "pontosFortes": ["<ponto 1>", "<ponto 2>", ...],
              "pontosFracos": ["<ponto 1>", ...],
              "recomendacao": "<aprovar|entrevistar|analisar_mais|rejeitar>",
              "recomendacaoTexto": "<1-2 frases justificando>"
            }

            Critérios de pontuação (pesos):
            - Experiência em telemedicina: +20 pts
            - Anos de experiência: +5 a +20 pts conforme faixa
            - Pós-graduação/Residência: +10 pts cada
            - Disponibilidade ampla (4+ dias, 2+ turnos): +10 pts
            - Carga horária 16h+: +5 pts
            - Campo "Sobre" preenchido: +5 pts

            Faixas de recomendação:
            - score >= 80: "aprovar"
            - score >= 60: "entrevistar"
            - score >= 40: "analisar_mais"
            - score < 40: "rejeitar"

            Responda APENAS com o JSON válido.
            """;

        var userContent = BuildCandidateProfile(input);
        var response = await CallChatCompletionAsync(systemPrompt, userContent, temperature: 0.3, maxTokens: 600, jsonMode: true, ct);
        if (string.IsNullOrWhiteSpace(response)) return null;

        try
        {
            var cleaned = CleanJsonResponse(response);
            using var doc = JsonDocument.Parse(cleaned);
            var root = doc.RootElement;

            var score = root.TryGetProperty("score", out var sEl) && sEl.ValueKind == JsonValueKind.Number ? sEl.GetInt32() : 50;
            var resumo = root.TryGetProperty("resumo", out var rEl) ? rEl.GetString() ?? "" : "";
            var pontosFortes = ExtractStringArray(root, "pontosFortes");
            var pontosFracos = ExtractStringArray(root, "pontosFracos");
            var recomendacao = root.TryGetProperty("recomendacao", out var recEl) ? recEl.GetString() ?? "analisar_mais" : "analisar_mais";
            var recomendacaoTexto = root.TryGetProperty("recomendacaoTexto", out var rtEl) ? rtEl.GetString() ?? "" : "";

            return new RhCandidateAnalysis(score, resumo, pontosFortes, pontosFracos, recomendacao, recomendacaoTexto);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RH AI: falha ao parsear análise do candidato. Raw (preview): {Preview}",
                response.Length > 300 ? response[..300] + "..." : response);
            return null;
        }
    }

    private async Task<string?> CallChatCompletionAsync(
        string systemPrompt,
        string userContent,
        double temperature,
        int maxTokens,
        bool jsonMode,
        CancellationToken ct)
    {
        var (apiKey, baseUrl, model) = ResolveProvider();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("RH AI: nenhuma API configurada (OpenAI__ApiKey ou Gemini__ApiKey) — skipping");
            return null;
        }

        try
        {
            object requestBody = jsonMode
                ? new
                {
                    model,
                    temperature,
                    max_tokens = maxTokens,
                    response_format = new { type = "json_object" },
                    messages = new[]
                    {
                        new { role = "system", content = systemPrompt },
                        new { role = "user", content = userContent }
                    }
                }
                : new
                {
                    model,
                    temperature,
                    max_tokens = maxTokens,
                    messages = new[]
                    {
                        new { role = "system", content = systemPrompt },
                        new { role = "user", content = userContent }
                    }
                };

            var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                WriteIndented = false
            });

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            client.Timeout = TimeSpan.FromSeconds(45);

            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var response = await client.PostAsync($"{baseUrl}/chat/completions", content, ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("RH AI chat completion failed: {StatusCode}", response.StatusCode);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(responseJson);
            // BUG FIX: GetProperty encadeado lançava KeyNotFoundException em payloads degradados.
            if (doc.RootElement.TryGetProperty("choices", out var choicesEl)
                && choicesEl.ValueKind == JsonValueKind.Array
                && choicesEl.GetArrayLength() > 0
                && choicesEl[0].TryGetProperty("message", out var msgEl)
                && msgEl.TryGetProperty("content", out var contentEl))
            {
                return contentEl.GetString();
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RH AI: erro ao chamar chat completion");
            return null;
        }
    }

    /// <summary>Prioriza OpenAI (GPT). Fallback para Gemini quando OpenAI ausente.</summary>
    private (string? apiKey, string baseUrl, string model) ResolveProvider()
    {
        var openAiKey = _config.Value?.ApiKey?.Trim();
        if (!string.IsNullOrEmpty(openAiKey) && !openAiKey.Contains("YOUR_") && !openAiKey.Contains("_HERE"))
            return (openAiKey, OpenAiBaseUrl, _config.Value?.Model ?? "gpt-4o");

        var geminiKey = _config.Value?.GeminiApiKey?.Trim();
        if (!string.IsNullOrEmpty(geminiKey) && !geminiKey.Contains("YOUR_") && !geminiKey.Contains("_HERE"))
        {
            var url = !string.IsNullOrWhiteSpace(_config.Value?.GeminiApiBaseUrl)
                ? _config.Value!.GeminiApiBaseUrl!.Trim()
                : GeminiBaseUrl;
            return (geminiKey, url, "gemini-2.5-flash");
        }

        return ("", OpenAiBaseUrl, _config.Value?.Model ?? "gpt-4o");
    }

    // LGPD: sanitiza campos livres antes de enviar a provedor externo (OpenAI/Gemini).
    // Remove CPF/RG/CRM/telefone/email/padrões de prompt injection.
    private static string Clean(string? s) => PromptSanitizer.SanitizeForPrompt(s);

    private static string BuildBioDetails(RhGenerateBioRequest p)
    {
        var exp = ExperienceMap.GetValueOrDefault(p.AnosExperiencia, p.AnosExperiencia);
        var cat = CategoryMap.GetValueOrDefault(p.Categoria, p.Categoria);

        var sb = new StringBuilder();
        sb.AppendLine($"Categoria: {cat}");
        sb.AppendLine($"Especialidade: {Clean(p.Especialidade)}");
        sb.AppendLine($"Experiência: {exp}");
        if (p.ExpTelemedicina == "sim") sb.AppendLine("Tem experiência com telemedicina");
        if (!string.IsNullOrWhiteSpace(p.Graduacao)) sb.AppendLine($"Graduação: {Clean(p.Graduacao)}");
        if (!string.IsNullOrWhiteSpace(p.Universidade)) sb.AppendLine($"Universidade: {Clean(p.Universidade)}");
        if (!string.IsNullOrWhiteSpace(p.PosGraduacao)) sb.AppendLine($"Pós-graduação: {Clean(p.PosGraduacao)}");
        if (!string.IsNullOrWhiteSpace(p.Residencia)) sb.AppendLine($"Residência: {Clean(p.Residencia)}");
        return sb.ToString();
    }

    private static string BuildCandidateProfile(RhAnalyzeCandidateRequest p)
    {
        var exp = ExperienceMap.GetValueOrDefault(p.AnosExperiencia, p.AnosExperiencia);
        var cat = CategoryMap.GetValueOrDefault(p.Categoria, p.Categoria);

        // LGPD: Nome completo e campo "Sobre" podem conter PII sensível (CPF, telefone, endereço).
        // Aplicamos PromptSanitizer para redact antes de enviar à OpenAI/Gemini.
        var sb = new StringBuilder();
        sb.AppendLine($"Nome: {Clean(p.Nome)}");
        sb.AppendLine($"Categoria: {cat}");
        sb.AppendLine($"Especialidade: {Clean(p.Especialidade)}");
        sb.AppendLine($"Experiência: {exp}");
        sb.AppendLine($"Telemedicina: {(p.ExpTelemedicina == "sim" ? "Sim" : "Não")}");
        sb.AppendLine($"Graduação: {Clean(p.Graduacao)} — {Clean(p.Universidade)} ({p.AnoConclusao})");
        if (!string.IsNullOrWhiteSpace(p.PosGraduacao)) sb.AppendLine($"Pós-graduação: {Clean(p.PosGraduacao)}");
        if (!string.IsNullOrWhiteSpace(p.Residencia)) sb.AppendLine($"Residência: {Clean(p.Residencia)}");
        if (!string.IsNullOrWhiteSpace(p.Sobre)) sb.AppendLine($"Sobre: {Clean(p.Sobre)}");
        return sb.ToString();
    }

    private static List<string> ExtractStringArray(JsonElement root, string prop)
    {
        var list = new List<string>();
        if (!root.TryGetProperty(prop, out var arr) || arr.ValueKind != JsonValueKind.Array) return list;
        foreach (var item in arr.EnumerateArray())
        {
            var s = item.GetString()?.Trim();
            if (!string.IsNullOrEmpty(s)) list.Add(s);
        }
        return list;
    }

    private static string CleanJsonResponse(string raw)
    {
        var s = raw.Trim();
        if (s.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            s = s["```json".Length..].TrimStart();
        else if (s.StartsWith("```"))
            s = s["```".Length..].TrimStart();
        if (s.EndsWith("```"))
            s = s[..^3].TrimEnd();
        return s;
    }
}
