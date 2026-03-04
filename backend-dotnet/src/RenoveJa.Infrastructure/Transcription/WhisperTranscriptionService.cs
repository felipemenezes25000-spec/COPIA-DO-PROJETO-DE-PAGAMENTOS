using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.Transcription;

/// <summary>
/// Transcrição de áudio via OpenAI Whisper API.
/// </summary>
public class WhisperTranscriptionService : ITranscriptionService
{
    private const string ApiUrl = "https://api.openai.com/v1/audio/transcriptions";
    private const string Model = "whisper-1";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<OpenAIConfig> _config;
    private readonly ILogger<WhisperTranscriptionService> _logger;

    public WhisperTranscriptionService(
        IHttpClientFactory httpClientFactory,
        IOptions<OpenAIConfig> config,
        ILogger<WhisperTranscriptionService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<string?> TranscribeAsync(
        byte[] audioBytes,
        string? fileName = null,
        CancellationToken cancellationToken = default)
    {
        var apiKey = _config.Value?.ApiKey?.Trim();
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("[Whisper] OpenAI:ApiKey não configurada. Transcrição ignorada. Configure em appsettings.Development.json ou variável OpenAI__ApiKey.");
            return null;
        }

        if (audioBytes == null || audioBytes.Length == 0)
        {
            _logger.LogWarning("[Whisper] Áudio vazio ou nulo recebido.");
            return null;
        }

        _logger.LogInformation("[Whisper] Transcrevendo áudio: {Bytes} bytes, arquivo: {FileName}", audioBytes.Length, fileName ?? "(sem nome)");

        var extension = string.IsNullOrEmpty(fileName)
            ? "webm"
            : (fileName.Contains('.') ? fileName.Substring(fileName.LastIndexOf('.') + 1) : "webm");
        var mime = extension.ToLowerInvariant() switch
        {
            "mp3" => "audio/mpeg",
            "m4a" => "audio/mp4",
            "wav" => "audio/wav",
            "webm" => "audio/webm",
            _ => "audio/webm"
        };
        var name = string.IsNullOrEmpty(fileName) ? $"chunk.{extension}" : fileName;

        // Whisper API: file deve vir primeiro; não alterar ContentType (boundary é essencial)
        using var content = new MultipartFormDataContent();
        var fileStreamContent = new StreamContent(new MemoryStream(audioBytes));
        fileStreamContent.Headers.ContentType = new MediaTypeHeaderValue(mime);
        content.Add(fileStreamContent, "file", name);
        content.Add(new StringContent(Model), "model");
        content.Add(new StringContent("pt"), "language");

        using var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl);
        request.Content = content;
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);

        var response = await client.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("[Whisper] API OpenAI erro: StatusCode={StatusCode}, Response={Response}", response.StatusCode, err);
            return null;
        }

        // Resposta é JSON: { "text": "..." }
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("text", out var textEl))
            {
                var text = textEl.GetString()?.Trim();
                if (!string.IsNullOrEmpty(text))
                {
                    _logger.LogInformation("[Whisper] Transcrição OK: {Length} caracteres", text.Length);
                    return text;
                }
            }
            _logger.LogWarning("[Whisper] Resposta JSON sem texto ou vazio: {Json}", json.Length > 200 ? json[..200] + "..." : json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Whisper] Falha ao parsear resposta JSON.");
        }

        return null;
    }
}
