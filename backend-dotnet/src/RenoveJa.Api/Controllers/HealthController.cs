using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Infrastructure.Data.Supabase;

namespace RenoveJa.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
[EnableRateLimiting("fixed")]
public class HealthController : ControllerBase
{
    private readonly SupabaseConfig _dbConfig;
    private readonly IRequestRepository _requestRepository;
    private readonly MercadoPagoConfig _mercadoPagoConfig;
    private readonly OpenAIConfig _openAiConfig;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        IOptions<SupabaseConfig> dbConfig,
        IRequestRepository requestRepository,
        IOptions<MercadoPagoConfig> mercadoPagoConfig,
        IOptions<OpenAIConfig> openAiConfig,
        ILogger<HealthController> logger)
    {
        _dbConfig = dbConfig.Value;
        _requestRepository = requestRepository;
        _mercadoPagoConfig = mercadoPagoConfig.Value;
        _openAiConfig = openAiConfig.Value;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var checks = new Dictionary<string, object>();
        var overall = true;

        // Database (RDS PostgreSQL via Npgsql)
        try
        {
            await _requestRepository.GetByIdAsync(Guid.Empty, ct);
            checks["database"] = new { status = "ok" };
        }
        catch (Exception ex)
        {
            checks["database"] = new { status = "error", message = ex.Message };
            overall = false;
        }

        // Storage (S3 — just check config is present)
        var s3Ok = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AWS_REGION"))
                || Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
        checks["storage"] = new { status = s3Ok ? "ok" : "degraded", provider = s3Ok ? "s3" : "local" };

        if (!overall)
            _logger.LogWarning("Health check DEGRADED: checks={Checks}", string.Join(",", checks.Keys));

        return Ok(new
        {
            status = overall ? "healthy" : "degraded",
            timestamp = DateTime.UtcNow,
            service = "RenoveJa API",
            version = "1.0.0",
            checks
        });
    }

    [HttpGet("readiness")]
    [AllowAnonymous]
    public async Task<IActionResult> GetReadiness(CancellationToken ct)
    {
        var detailed = User.Identity?.IsAuthenticated == true;
        var checks = new Dictionary<string, object>();
        var dbOk = false;
        var paymentOk = false;
        var aiOk = false;

        // Database
        try
        {
            _ = await _requestRepository.GetByIdAsync(Guid.Empty, ct);
            checks["database"] = new { status = "ok" };
            dbOk = true;
        }
        catch (Exception ex)
        {
            checks["database"] = detailed
                ? new { status = "error", message = ex.Message }
                : (object)new { status = "error" };
            _logger.LogWarning(ex, "Readiness: database check failed");
        }

        // Storage (S3)
        var storageOk = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AWS_REGION"))
                     || Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
        checks["storage"] = new { status = storageOk ? "ok" : "degraded", provider = storageOk ? "s3" : "local" };

        // Payment gateway
        paymentOk = !string.IsNullOrWhiteSpace(_mercadoPagoConfig.AccessToken);
        checks["payment"] = new { status = paymentOk ? "ok" : "degraded" };

        // AI service
        aiOk = !string.IsNullOrWhiteSpace(_openAiConfig.GeminiApiKey) || !string.IsNullOrWhiteSpace(_openAiConfig.ApiKey);
        checks["ai"] = new { status = aiOk ? "ok" : "degraded" };

        var overall = dbOk ? (storageOk && paymentOk && aiOk ? "healthy" : "degraded") : "unhealthy";

        if (overall != "healthy")
            _logger.LogWarning("Readiness {Status}: db={Db}, storage={Storage}, payment={Payment}, ai={Ai}",
                overall, dbOk, storageOk, paymentOk, aiOk);

        return Ok(new { status = overall, timestamp = DateTime.UtcNow, service = "RenoveJa API", checks });
    }

    [HttpGet("slo")]
    public IActionResult Slo() => Ok(new
    {
        targets = new { availabilityPercent = 99.8, p95LatencyMs = 450, paymentErrorRatePercent = 0.8 },
        currentStatus = "monitoring",
        timestamp = DateTime.UtcNow,
        service = "RenoveJa API"
    });
}
