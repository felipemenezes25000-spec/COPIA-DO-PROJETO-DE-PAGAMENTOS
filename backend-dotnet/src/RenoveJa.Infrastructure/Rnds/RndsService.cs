using System.Net.Http.Headers;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.Rnds;

/// <summary>
/// Implementação do serviço RNDS — Rede Nacional de Dados em Saúde.
/// Autenticação: Two-way SSL com certificado ICP-Brasil.
/// API: RESTful FHIR R4.
/// 
/// Fluxo:
/// 1. POST /token → obtém access_token (15min) via certificado digital
/// 2. Usa token no header X-Authorization-Server: Bearer {token}
/// 3. Envia Bundle FHIR via POST /fhir/r4/Bundle
/// 4. Sucesso = HTTP 201 + Location header com ID RNDS
/// 
/// Ref: https://rnds-guia.saude.gov.br
/// </summary>
public class RndsService : IRndsService
{
    private readonly RndsConfig _config;
    private readonly ILogger<RndsService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    // Token cache (15 min lifetime)
    private string? _cachedToken;
    private DateTime _tokenExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _authLock = new(1, 1);

    public RndsService(
        IOptions<RndsConfig> config,
        IHttpClientFactory httpClientFactory,
        ILogger<RndsService> logger)
    {
        _config = config.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    // ══════════════════════════════════════════════════════════════
    // AUTENTICAÇÃO — Two-way SSL + token
    // ══════════════════════════════════════════════════════════════

    public async Task<RndsAuthResult> AuthenticateAsync(CancellationToken ct = default)
    {
        await _authLock.WaitAsync(ct);
        try
        {
            // Return cached token if still valid
            if (_cachedToken != null && DateTime.UtcNow < _tokenExpiry)
            {
                return new RndsAuthResult(true, _cachedToken, _tokenExpiry, null);
            }

            if (string.IsNullOrWhiteSpace(_config.CertificadoPath))
            {
                return new RndsAuthResult(false, null, null,
                    "RNDS: Certificado digital não configurado. Configure Rnds__CertificadoPath e Rnds__CertificadoSenha.");
            }

            // Load ICP-Brasil certificate
            var cert = new X509Certificate2(
                _config.CertificadoPath,
                _config.CertificadoSenha,
                X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.PersistKeySet);

            // Create handler with client certificate (two-way SSL)
            var handler = new HttpClientHandler();
            handler.ClientCertificates.Add(cert);
            handler.ClientCertificateOptions = ClientCertificateOption.Manual;

            using var client = new HttpClient(handler);
            client.Timeout = TimeSpan.FromSeconds(_config.TimeoutSeconds);

            var authUrl = _config.GetAuthUrl();
            _logger.LogInformation("RNDS: Authenticating at {Url}", authUrl);

            // POST /token — empty body, cert does the auth
            var response = await client.PostAsync($"{authUrl}/token", null, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("RNDS: Auth failed — HTTP {Status}: {Body}", (int)response.StatusCode, errorBody);
                return new RndsAuthResult(false, null, null, $"HTTP {(int)response.StatusCode}: {errorBody}");
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            var tokenDoc = JsonDocument.Parse(json);
            var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();

            // Token is valid for 15 minutes (RNDS default) — cache with 14min safety margin
            _cachedToken = accessToken;
            _tokenExpiry = DateTime.UtcNow.AddMinutes(14);

            _logger.LogInformation("RNDS: Authenticated successfully. Token expires at {Expiry}", _tokenExpiry);
            return new RndsAuthResult(true, accessToken, _tokenExpiry, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RNDS: Authentication error");
            return new RndsAuthResult(false, null, null, ex.Message);
        }
        finally
        {
            _authLock.Release();
        }
    }

    // ══════════════════════════════════════════════════════════════
    // CONSULTAR PACIENTE
    // ══════════════════════════════════════════════════════════════

    /// <summary>
    /// GET /fhir/r4/Patient?identifier=https://.../{cns|cpf}
    /// </summary>
    public async Task<RndsPatientResult> GetPatientAsync(string cnsOrCpf, CancellationToken ct = default)
    {
        try
        {
            var auth = await AuthenticateAsync(ct);
            if (!auth.Success)
                return new RndsPatientResult(false, null, null, $"Auth failed: {auth.ErrorMessage}");

            var client = CreateAuthorizedClient(auth.AccessToken!);
            var ehrUrl = _config.GetEhrUrl();

            // Determine identifier system based on length
            var system = cnsOrCpf.Replace(" ", "").Replace(".", "").Replace("-", "").Length == 11
                ? "http://www.saude.gov.br/fhir/r4/NamingSystem/cpf"
                : "http://www.saude.gov.br/fhir/r4/NamingSystem/cns";

            var cleanId = cnsOrCpf.Replace(" ", "").Replace(".", "").Replace("-", "");
            var url = $"{ehrUrl}/fhir/r4/Patient?identifier={system}|{cleanId}";

            _logger.LogInformation("RNDS: GET Patient {Url}", url);
            var response = await client.GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                return new RndsPatientResult(false, null, null, $"HTTP {(int)response.StatusCode}: {errorBody}");
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            // Extract patient ID from response Bundle
            var doc = JsonDocument.Parse(json);
            string? patientId = null;
            if (doc.RootElement.TryGetProperty("entry", out var entries) && entries.GetArrayLength() > 0)
            {
                var resource = entries[0].GetProperty("resource");
                patientId = resource.GetProperty("id").GetString();
            }

            return new RndsPatientResult(true, patientId, json, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RNDS: Error getting patient {Id}", cnsOrCpf);
            return new RndsPatientResult(false, null, null, ex.Message);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // ENVIAR BUNDLE (documento clínico)
    // ══════════════════════════════════════════════════════════════

    /// <summary>
    /// POST /fhir/r4/Bundle
    /// Headers: X-Authorization-Server: Bearer {token}
    ///          Content-Type: application/fhir+json
    ///          X-Authorization-Server: Bearer {token}
    /// 
    /// Sucesso: HTTP 201 + header Location com ID RNDS
    /// </summary>
    public async Task<RndsSendResult> SendBundleAsync(object fhirBundle, string cnsProfissional, CancellationToken ct = default)
    {
        try
        {
            var auth = await AuthenticateAsync(ct);
            if (!auth.Success)
                return new RndsSendResult(false, null, null, 0, $"Auth failed: {auth.ErrorMessage}");

            var client = CreateAuthorizedClient(auth.AccessToken!);
            var ehrUrl = _config.GetEhrUrl();
            var url = $"{ehrUrl}/fhir/r4/Bundle";

            // Serialize FHIR Bundle
            var json = JsonSerializer.Serialize(fhirBundle, new JsonSerializerOptions
            {
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            });

            var content = new StringContent(json, Encoding.UTF8, "application/fhir+json");

            // Add professional CNS header
            client.DefaultRequestHeaders.Add("X-Authorization-Server", $"Bearer {auth.AccessToken}");

            _logger.LogInformation("RNDS: POST Bundle ({Bytes} bytes) to {Url}", json.Length, url);
            var response = await client.PostAsync(url, content, ct);

            var statusCode = (int)response.StatusCode;
            var locationHeader = response.Headers.Location?.ToString();

            if (response.IsSuccessStatusCode)
            {
                // Extract RNDS ID from Location header
                var rndsId = locationHeader?.Split('/').LastOrDefault();
                _logger.LogInformation("RNDS: Bundle sent successfully. RNDS ID: {Id}, Location: {Location}", rndsId, locationHeader);
                return new RndsSendResult(true, rndsId, locationHeader, statusCode, null);
            }

            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("RNDS: Bundle send failed — HTTP {Status}: {Body}", statusCode, errorBody);
            return new RndsSendResult(false, null, locationHeader, statusCode, errorBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RNDS: Error sending Bundle");
            return new RndsSendResult(false, null, null, 0, ex.Message);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // CONSULTAR TIMELINE (registros clínicos do paciente)
    // ══════════════════════════════════════════════════════════════

    public async Task<RndsTimelineResult> GetTimelineAsync(string cnsPaciente, CancellationToken ct = default)
    {
        try
        {
            var auth = await AuthenticateAsync(ct);
            if (!auth.Success)
                return new RndsTimelineResult(false, null, 0, $"Auth failed: {auth.ErrorMessage}");

            var client = CreateAuthorizedClient(auth.AccessToken!);
            var ehrUrl = _config.GetEhrUrl();

            // Gerar contexto de atendimento primeiro
            var contextUrl = $"{ehrUrl}/contexto-atendimento/{cnsPaciente.Replace(" ", "")}";
            _logger.LogInformation("RNDS: GET Timeline context for {Cns}", cnsPaciente);

            var response = await client.GetAsync(contextUrl, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                return new RndsTimelineResult(false, null, 0, $"HTTP {(int)response.StatusCode}: {errorBody}");
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            var doc = JsonDocument.Parse(json);
            var total = doc.RootElement.TryGetProperty("total", out var t) ? t.GetInt32() : 0;

            return new RndsTimelineResult(true, json, total, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RNDS: Error getting timeline for {Cns}", cnsPaciente);
            return new RndsTimelineResult(false, null, 0, ex.Message);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // HEALTH CHECK
    // ══════════════════════════════════════════════════════════════

    public async Task<bool> HealthCheckAsync(CancellationToken ct = default)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            var ehrUrl = _config.GetEhrUrl();
            var response = await client.GetAsync($"{ehrUrl}/fhir/r4/metadata", ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    // ══════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════

    private HttpClient CreateAuthorizedClient(string accessToken)
    {
        var client = _httpClientFactory.CreateClient("Rnds");
        client.Timeout = TimeSpan.FromSeconds(_config.TimeoutSeconds);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }
}
