using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Application.Interfaces;
using ImageMagick;

namespace RenoveJa.Infrastructure.AiReading;

/// <summary>
/// Serviço de leitura com GPT-4o para receitas e pedidos de exame.
/// Usa base64 para imagens do nosso storage (evita problemas com bucket privado); URLs externas são usadas diretamente.
/// </summary>
public class OpenAiReadingService : IAiReadingService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<OpenAIConfig> _config;
    private readonly IStorageService _storageService;
    private readonly ILogger<OpenAiReadingService> _logger;

    public OpenAiReadingService(
        IHttpClientFactory httpClientFactory,
        IOptions<OpenAIConfig> config,
        IStorageService storageService,
        ILogger<OpenAiReadingService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _storageService = storageService;
        _logger = logger;
    }
    private const string ApiBaseUrl = "https://api.openai.com/v1";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        WriteIndented = false
    };

    public async Task<AiPrescriptionAnalysisResult> AnalyzePrescriptionAsync(
        IReadOnlyList<string> imageUrls,
        CancellationToken cancellationToken = default)
    {
        if (imageUrls == null || imageUrls.Count == 0)
            return new AiPrescriptionAnalysisResult(false, null, null, null,
                "Nenhuma imagem de receita enviada.");

        var apiKey = _config.Value?.ApiKey?.Trim();
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("IA receita: OpenAI:ApiKey não configurada. Defina em appsettings.json ou variável OpenAI__ApiKey.");
            return new AiPrescriptionAnalysisResult(true,
                "[Análise por IA não configurada. Defina OpenAI:ApiKey em appsettings ou variável OpenAI__ApiKey.]",
                null, null, null);
        }

        var systemPrompt = """
Você é um assistente que analisa imagens de receitas médicas vencidas para renovação.

REGRAS DE REJEIÇÃO (quando CERTO - NÃO aceite, sinalize para rejeição):
• INCONSISTÊNCIA ÓBVIA: quando tiver CERTEZA de problema, use has_doubts: false e preencha os campos corretamente. O sistema rejeitará automaticamente.
  Exemplos de inconsistência óbvia: nome na receita claramente diferente do cadastro (ex: "Maria" vs "João"); tipo da receita claramente "Controle Especial" mas usuário selecionou "simples"; adulteração evidente (edição, colagem); nome/tipo claramente recortado ou em branco.
• has_doubts: false + flags corretos = rejeição automática. NÃO aceite inconsistências óbvias.

QUANDO TIVER DÚVIDA (incerteza real): use has_doubts: true. Ex: nome pode ser abreviação; recorte pode ser acidental; tipo pouco legível. Encaminhe ao médico com "DÚVIDAS:" no resumo.

REJEITE (readability_ok: false) quando tiver CERTEZA de que:
• A imagem contém ROSTOS, SELFIES, ANIMAIS, PAISAGENS, OBJETOS, COMIDA, BEBIDAS
• A imagem mostra EMBALAGENS sem documento de receita
• A imagem é de TELA que NÃO seja documento médico
• A imagem está BORRADA, ESCURA ou ilegível
• NÃO há medicamentos ou dosagens identificáveis
• Qualquer conteúdo que NÃO seja claramente um receituário médico

Analise a(s) imagem(ns) e responda em JSON com exatamente estes campos:

- readability_ok (boolean): false quando CERTEZA de que não é receita legível; true quando for receita legível.
- message_to_user (string ou null): Se readability_ok for false, mensagem em português.
- summary_for_doctor (string): PRONTUÁRIO. Inclua "DÚVIDAS:" quando has_doubts for true. Formato:
  "MEDICAMENTOS IDENTIFICADOS: • [med] - [dosagem]
  MÉDICO ANTERIOR: [nome]
  OBSERVAÇÕES: [texto]
  DÚVIDAS: [apenas quando has_doubts: true - liste incertezas]"
- extracted (objeto): { "medications": [...], "dosage": "...", "previous_doctor": "nome ou null", "prescription_type_detected": "simples"|"controlado"|"azul"|null, "patient_name_detected": "nome" ou null, "patient_name_visible": true|false, "prescription_type_visible": true|false, "signs_of_tampering": true|false, "has_doubts": true|false }
  has_doubts: true APENAS quando houver incerteza real. Se a inconsistência for ÓBVIA (nome diferente, tipo errado, adulteração clara, recorte evidente), use has_doubts: false e preencha os campos para rejeição.
  patient_name_visible: false se nome recortado/em branco/rasurado (óbvio). Se incerto, has_doubts: true.
  prescription_type_visible: false se tipo oculto/recortado (óbvio). Se incerto, has_doubts: true.
  signs_of_tampering: true se CERTEZA de adulteração. Se incerto, has_doubts: true.
- risk_level (string): "low", "medium" ou "high"

Responda APENAS com o JSON, sem markdown e sem texto antes ou depois.
""";

        var userContent = new List<object>
        {
            new { type = "text", text = "Analise a(s) imagem(ns) desta receita médica e retorne o JSON conforme instruído." }
        };
        var resolvedImages = await ResolveImageContentsAsync(imageUrls.Take(5).ToList(), cancellationToken);
        _logger.LogInformation("IA receita: resolvidas {Count}/{Total} imagens para envio à OpenAI", resolvedImages.Count, imageUrls.Count);
        foreach (var imageItem in resolvedImages)
        {
            userContent.Add(imageItem);
        }

        var result = await CallChatAsync(systemPrompt, userContent, apiKey, cancellationToken);
        return ParsePrescriptionResult(result);
    }

    public async Task<AiExamAnalysisResult> AnalyzeExamAsync(
        IReadOnlyList<string>? imageUrls,
        string? textDescription,
        CancellationToken cancellationToken = default)
    {
        var hasImages = imageUrls != null && imageUrls.Count > 0;
        var hasText = !string.IsNullOrWhiteSpace(textDescription);

        if (!hasImages && !hasText)
            return new AiExamAnalysisResult(false, null, null, null,
                "Envie o pedido de exame em texto ou uma imagem do pedido antigo.");

        var apiKey = _config.Value?.ApiKey?.Trim();
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("IA exame: OpenAI:ApiKey não configurada. Defina em appsettings.json ou variável OpenAI__ApiKey.");
            return new AiExamAnalysisResult(true,
                "[Análise por IA não configurada. Defina OpenAI:ApiKey.]",
                null, null, null);
        }

        var systemPrompt = """
Você é um assistente que analisa pedidos de exame (imagem e/ou texto) para o médico.
- Se receber imagem(ns): extraia tipo de exame, indicação clínica e classifique urgência.
- Se receber só texto: ajuste e estruture o texto para o médico (ortografia, clareza), sem inventar dados.

REGRAS CRÍTICAS (quando houver imagens) - REJEITE (readability_ok: false) SE:
• ROSTOS, SELFIES, RETRATOS ou partes do corpo em destaque
• ANIMAIS, PAISAGENS, NATUREZA, OBJETOS, COMIDA
• TELA de celular/computador que não seja documento médico
• EMBALAGENS ou frascos sem requisição/laudo visível
• Imagem BORRADA, ESCURA ou sem texto de exame legível
• Qualquer conteúdo que NÃO seja pedido de exame, requisição médica ou laudo

OBRIGATÓRIO: A imagem deve ser UNICAMENTE um documento médico (pedido de exame, requisição ou laudo) legível. Na dúvida, REJEITE.
Mensagem: "A imagem não parece ser de pedido de exame ou documento médico. Envie APENAS imagens do pedido de exame, requisição ou laudo. Não envie fotos de pessoas, animais ou outros objetos."

Responda em JSON com exatamente:
- readability_ok (boolean): false se houver imagem mas estiver ilegível ou NÃO for documento médico; true caso contrário.
- message_to_user (string ou null): Se readability_ok for false, mensagem em português pedindo foto mais nítida.
- summary_for_doctor (string): PRONTUÁRIO estruturado para o médico copiar/colar. Formato:
  "EXAMES SOLICITADOS:
  • [Exame 1]
  • [Exame 2]
  INDICAÇÃO CLÍNICA: [motivo clínico ou sintomas]
  OBSERVAÇÕES: [outras informações relevantes]"
  Em português, ortografia correta.
- extracted (objeto): { "exam_type": "tipo principal", "exams": ["exame1", "exame2"], "clinical_indication": "..." } (ou vazio se só texto)
- urgency (string): "routine", "urgent" ou "emergency"

Responda APENAS com o JSON, sem markdown e sem texto antes ou depois.
""";

        var userParts = new List<object>();
        if (hasText)
            userParts.Add(new { type = "text", text = $"Texto do pedido de exame:\n{textDescription}" });
        if (hasImages)
        {
            userParts.Add(new { type = "text", text = "Analise também a(s) imagem(ns) abaixo." });
            foreach (var imageItem in await ResolveImageContentsAsync(imageUrls!.Take(5).ToList(), cancellationToken))
            {
                userParts.Add(imageItem);
            }
        }
        userParts.Insert(0, new { type = "text", text = "Analise o pedido de exame (texto e/ou imagens) e retorne o JSON." });

        var result = await CallChatAsync(systemPrompt, userParts, apiKey, cancellationToken);
        return ParseExamResult(result);
    }

    private async Task<string> CallChatAsync(string systemPrompt, List<object> userContent, string apiKey, CancellationToken cancellationToken)
    {
        var requestBody = new
        {
            model = _config.Value?.Model ?? "gpt-4o",
            messages = new object[]
            {
                new { role = "system", content = (object)systemPrompt },
                new { role = "user", content = (object)userContent }
            },
            max_tokens = 2000
        };

        var json = JsonSerializer.Serialize(requestBody, JsonOptions);
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        client.Timeout = TimeSpan.FromSeconds(60);

        using var requestContent = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"{ApiBaseUrl}/chat/completions", requestContent, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("OpenAI API error: StatusCode={StatusCode}, Response={Response}", response.StatusCode, err);
            throw new InvalidOperationException($"OpenAI API error: {response.StatusCode}. {err}");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var choices = doc.RootElement.GetProperty("choices");
        if (choices.GetArrayLength() == 0)
        {
            _logger.LogWarning("OpenAI retornou choices vazio. Resposta raw pode conter erro.");
            throw new InvalidOperationException("OpenAI retornou resposta vazia.");
        }
        var message = choices[0].GetProperty("message");
        var contentEl = message.GetProperty("content");
        return contentEl.GetString() ?? "";
    }

    private static AiPrescriptionAnalysisResult ParsePrescriptionResult(string raw)
    {
        var (readabilityOk, messageToUser, summary, extracted, riskLevel, extractedPrescriptionType, extractedPatientName, patientNameVisible, prescriptionTypeVisible, signsOfTampering, hasDoubts) = ParseCommonAndRisk(raw);
        return new AiPrescriptionAnalysisResult(readabilityOk, summary, extracted, riskLevel, messageToUser, extractedPrescriptionType, extractedPatientName, patientNameVisible, prescriptionTypeVisible, signsOfTampering, hasDoubts);
    }

    private static AiExamAnalysisResult ParseExamResult(string raw)
    {
        var (readabilityOk, messageToUser, summary, extracted, _, _, _, _, _, _, _) = ParseCommonAndRisk(raw);
        string? urgency = null;
        try
        {
            var cleaned = CleanJsonResponse(raw);
            using var doc = JsonDocument.Parse(cleaned);
            if (doc.RootElement.TryGetProperty("urgency", out var u))
                urgency = u.GetString();
        }
        catch { /* ignore */ }
        return new AiExamAnalysisResult(readabilityOk, summary, extracted, urgency, messageToUser);
    }

    private static (bool readabilityOk, string? messageToUser, string? summary, string? extracted, string? riskLevel, string? extractedPrescriptionType, string? extractedPatientName, bool? patientNameVisible, bool? prescriptionTypeVisible, bool? signsOfTampering, bool? hasDoubts) ParseCommonAndRisk(string raw)
    {
        try
        {
            var cleaned = CleanJsonResponse(raw);
            using var doc = JsonDocument.Parse(cleaned);
            var r = doc.RootElement;
            var readabilityOk = r.TryGetProperty("readability_ok", out var ro) && ro.GetBoolean();
            var messageToUser = r.TryGetProperty("message_to_user", out var mu) ? mu.GetString() : null;
            var summary = r.TryGetProperty("summary_for_doctor", out var s) ? s.GetString() : null;
            var riskLevel = r.TryGetProperty("risk_level", out var rl) ? rl.GetString() : null;
            string? extracted = null;
            string? extractedPrescriptionType = null;
            string? extractedPatientName = null;
            bool? patientNameVisible = null;
            bool? prescriptionTypeVisible = null;
            bool? signsOfTampering = null;
            bool? hasDoubts = null;
            if (r.TryGetProperty("extracted", out var ex))
            {
                extracted = ex.GetRawText();
                if (ex.TryGetProperty("prescription_type_detected", out var ptd))
                {
                    var v = ptd.GetString()?.Trim().ToLowerInvariant();
                    if (!string.IsNullOrEmpty(v) && (v == "simples" || v == "controlado" || v == "azul"))
                        extractedPrescriptionType = v;
                }
                if (ex.TryGetProperty("patient_name_detected", out var pnd))
                {
                    var v = pnd.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(v) && v.Length >= 2)
                        extractedPatientName = v;
                }
                if (ex.TryGetProperty("patient_name_visible", out var pnv))
                    patientNameVisible = pnv.ValueKind == JsonValueKind.True || pnv.ValueKind == JsonValueKind.False ? pnv.GetBoolean() : null;
                if (ex.TryGetProperty("prescription_type_visible", out var ptv))
                    prescriptionTypeVisible = ptv.ValueKind == JsonValueKind.True || ptv.ValueKind == JsonValueKind.False ? ptv.GetBoolean() : null;
                if (ex.TryGetProperty("signs_of_tampering", out var sot))
                    signsOfTampering = sot.ValueKind == JsonValueKind.True || sot.ValueKind == JsonValueKind.False ? sot.GetBoolean() : null;
                if (ex.TryGetProperty("has_doubts", out var hd))
                    hasDoubts = hd.ValueKind == JsonValueKind.True || hd.ValueKind == JsonValueKind.False ? hd.GetBoolean() : null;
            }
            return (readabilityOk, messageToUser, summary, extracted, riskLevel, extractedPrescriptionType, extractedPatientName, patientNameVisible, prescriptionTypeVisible, signsOfTampering, hasDoubts);
        }
        catch
        {
            return (false, "Resposta da IA em formato inesperado. Tente enviar uma imagem mais legível.", raw, null, null, null, null, null, null, null, null);
        }
    }

    /// <summary>
    /// Resolve imagens: baixa do nosso storage e envia como base64 (acessível mesmo com bucket privado).
    /// Converte HEIF/HEIC/PDF para JPEG antes de enviar à OpenAI (que só aceita png, jpeg, gif, webp).
    /// Nunca envia URL direta para formatos não suportados (HEIC etc.) – OpenAI rejeita.
    /// </summary>
    private async Task<List<object>> ResolveImageContentsAsync(IReadOnlyList<string> urls, CancellationToken cancellationToken)
    {
        var result = new List<object>();
        for (var i = 0; i < urls.Count; i++)
        {
            var url = urls[i];
            if (string.IsNullOrWhiteSpace(url))
            {
                _logger.LogDebug("IA: URL #{Index} vazia, ignorando", i + 1);
                continue;
            }
            try
            {
                var bytes = await _storageService.DownloadFromStorageUrlAsync(url, cancellationToken);
                if (bytes == null || bytes.Length == 0)
                {
                    if (IsUnsupportedFormatForDirectUrl(url))
                    {
                        _logger.LogWarning("IA: URL #{Index} não pode ser usada (HEIC/HEIF/PDF) e download falhou. Ignorando: {Url}", i + 1, url);
                    }
                    else
                    {
                        result.Add(new { type = "image_url", image_url = new { url = url } });
                        _logger.LogWarning("IA: URL #{Index} retornou vazio, usando URL direta: {Url}", i + 1, url);
                    }
                    continue;
                }
                var (outBytes, mime) = ConvertToOpenAiSupportedFormat(bytes, url);
                var b64 = Convert.ToBase64String(outBytes);
                result.Add(new { type = "image_url", image_url = new { url = $"data:{mime};base64,{b64}" } });
                _logger.LogDebug("IA: URL #{Index} baixada ok, {Size} bytes, mime={Mime}", i + 1, outBytes.Length, mime);
            }
            catch (Exception ex)
            {
                if (IsUnsupportedFormatForDirectUrl(url))
                {
                    _logger.LogWarning(ex, "IA: URL #{Index} HEIC/HEIF/PDF e download/conversão falhou. Ignorando: {Url}", i + 1, url);
                }
                else
                {
                    _logger.LogWarning(ex, "IA: falha ao baixar URL #{Index} ({Url}), usando URL direta", i + 1, url);
                    result.Add(new { type = "image_url", image_url = new { url = url } });
                }
            }
        }
        return result;
    }

    private static bool IsUnsupportedFormatForDirectUrl(string url)
    {
        return url.Contains(".heif", StringComparison.OrdinalIgnoreCase) ||
               url.Contains(".heic", StringComparison.OrdinalIgnoreCase) ||
               url.Contains(".pdf", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Converte imagens HEIF/HEIC/PDF para JPEG (formato aceito pela OpenAI).
    /// Detecta por URL e por magic bytes. png, jpeg, gif, webp são enviados sem conversão.
    /// </summary>
    private (byte[] bytes, string mime) ConvertToOpenAiSupportedFormat(byte[] data, string url)
    {
        var needsConversion = url.Contains(".heif", StringComparison.OrdinalIgnoreCase) ||
                             url.Contains(".heic", StringComparison.OrdinalIgnoreCase) ||
                             url.Contains(".pdf", StringComparison.OrdinalIgnoreCase) ||
                             IsHeicMagicBytes(data) ||
                             IsPdfMagicBytes(data);

        if (!needsConversion)
        {
            var mime = "image/jpeg";
            if (url.Contains(".png", StringComparison.OrdinalIgnoreCase)) mime = "image/png";
            else if (url.Contains(".webp", StringComparison.OrdinalIgnoreCase)) mime = "image/webp";
            else if (url.Contains(".gif", StringComparison.OrdinalIgnoreCase)) mime = "image/gif";
            return (data, mime);
        }

        try
        {
            var isPdf = url.Contains(".pdf", StringComparison.OrdinalIgnoreCase) || IsPdfMagicBytes(data);
            var settings = isPdf ? new MagickReadSettings { Density = new Density(150, 150) } : null;
            using var image = settings != null ? new MagickImage(data, settings) : new MagickImage(data);
            image.Quality = 85;
            using var ms = new MemoryStream();
            image.Write(ms, MagickFormat.Jpeg);
            return (ms.ToArray(), "image/jpeg");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "IA: falha ao converter HEIC/PDF para JPEG: {Url}", url);
            throw new InvalidOperationException($"Não foi possível converter a imagem (HEIC/PDF) para formato suportado: {ex.Message}");
        }
    }

    private static bool IsHeicMagicBytes(byte[] data)
    {
        if (data == null || data.Length < 12) return false;
        return data[4] == 'f' && data[5] == 't' && data[6] == 'y' && data[7] == 'p';
    }

    private static bool IsPdfMagicBytes(byte[] data)
    {
        if (data == null || data.Length < 5) return false;
        return data[0] == '%' && data[1] == 'P' && data[2] == 'D' && data[3] == 'F';
    }

    private static string CleanJsonResponse(string raw)
    {
        var s = raw.Trim();
        if (s.StartsWith("```json")) s = s["```json".Length..];
        else if (s.StartsWith("```")) s = s["```".Length..];
        if (s.EndsWith("```")) s = s[..^3];
        return s.Trim();
    }
}
