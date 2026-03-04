using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.WhatsApp;

/// <summary>
/// Implementação do envio de documentos via WhatsApp Business Cloud API.
/// </summary>
public class WhatsAppService : IWhatsAppService
{
    private const string GraphApiBase = "https://graph.facebook.com/v18.0";
    private readonly HttpClient _httpClient;
    private readonly WhatsAppConfig _config;
    private readonly ILogger<WhatsAppService> _logger;

    public WhatsAppService(
        IHttpClientFactory httpClientFactory,
        IOptions<WhatsAppConfig> config,
        ILogger<WhatsAppService> logger)
    {
        _httpClient = httpClientFactory.CreateClient();
        _config = config.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<(bool Success, string? ErrorMessage)> SendDocumentAsync(
        string phoneNumber,
        byte[] pdfBytes,
        string filename,
        string? caption = null,
        CancellationToken cancellationToken = default)
    {
        if (!_config.IsConfigured)
        {
            _logger.LogDebug("WhatsApp não configurado (ApiToken ou PhoneNumberId ausente).");
            return (false, "WhatsApp não configurado. Configure WhatsApp__ApiToken e WhatsApp__PhoneNumberId.");
        }

        var normalizedPhone = NormalizePhone(phoneNumber);
        if (string.IsNullOrEmpty(normalizedPhone))
        {
            return (false, "Número de telefone inválido.");
        }

        try
        {
            var mediaId = await UploadMediaAsync(pdfBytes, filename, cancellationToken);
            if (string.IsNullOrEmpty(mediaId))
                return (false, "Falha ao enviar arquivo para o WhatsApp.");

            var sent = await SendDocumentMessageAsync(normalizedPhone, mediaId, filename, caption, cancellationToken);
            if (sent)
                _logger.LogInformation("Documento enviado por WhatsApp para {Phone}", MaskPhone(normalizedPhone));
            return (sent, sent ? null : "Falha ao enviar mensagem.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Erro ao enviar documento via WhatsApp para {Phone}", MaskPhone(normalizedPhone));
            return (false, ex.Message);
        }
    }

    private async Task<string?> UploadMediaAsync(byte[] pdfBytes, string filename, CancellationToken ct)
    {
        var url = $"{GraphApiBase}/{_config.PhoneNumberId}/media";
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pdfBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", filename);
        content.Add(new StringContent("application/pdf"), "type");
        content.Add(new StringContent("whatsapp"), "messaging_product");

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config.ApiToken);
        request.Content = content;

        var response = await _httpClient.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("WhatsApp upload media error: {Status} {Body}", response.StatusCode, body);
            return null;
        }

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
    }

    private async Task<bool> SendDocumentMessageAsync(string to, string mediaId, string filename, string? caption, CancellationToken ct)
    {
        var url = $"{GraphApiBase}/{_config.PhoneNumberId}/messages";
        var payload = new
        {
            messaging_product = "whatsapp",
            recipient_type = "individual",
            to = to,
            type = "document",
            document = new
            {
                id = mediaId,
                filename = filename,
                caption = caption
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config.ApiToken);
        request.Content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("WhatsApp send message error: {Status} {Body}", response.StatusCode, body);
            return false;
        }

        return true;
    }

    private static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length < 10) return null;
        return digits.StartsWith("55") ? digits : $"55{digits}";
    }

    private static string MaskPhone(string phone) => phone.Length > 6 ? $"{phone[..4]}***{phone[^4..]}" : "***";
}
