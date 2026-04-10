using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RenoveJa.Application.Interfaces;
using RenoveJa.Infrastructure.Storage;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Endpoint administrativo para migração de paths S3 legados para o padrão
/// baseado em paciente (pacientes/{patientId}/...).
/// Protegido por header X-Admin-Key.
/// </summary>
[ApiController]
[Route("api/admin/migration")]
[Authorize(Roles = "admin")]
public class AdminMigrationController(
    S3MigrationService migrationService,
    IClinicalEvidenceService clinicalEvidenceService,
    IConfiguration configuration,
    ILogger<AdminMigrationController> logger) : ControllerBase
{
    /// <summary>
    /// POST /api/admin/migration/s3?dryRun=true
    /// Dry-run por padrão. Envie dryRun=false para executar de fato.
    /// Requer header X-Admin-Key com valor configurado em ADMIN_MIGRATION_KEY.
    /// </summary>
    [HttpPost("s3")]
    public async Task<IActionResult> MigrateS3(
        [FromQuery] bool dryRun = true,
        CancellationToken ct = default)
    {
        var authResult = ValidateAdminKey();
        if (authResult != null)
            return authResult;

        var callerId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
        logger.LogWarning(
            "[AdminMigration][AUDIT] S3 migration triggered. CallerUserId={CallerUserId} DryRun={DryRun} IP={Ip}",
            callerId, dryRun, HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        var result = await migrationService.MigrateAsync(dryRun, ct);

        return Ok(new
        {
            mode = dryRun ? "DRY-RUN" : "LIVE",
            scanned = result.Scanned,
            copied = result.Copied,
            db_updated = result.DbUpdated,
            errors = result.Errors,
            error_details = result.ErrorDetails.Take(50)
        });
    }

    /// <summary>
    /// POST /api/admin/migration/clear-evidence-cache
    /// Limpa todo o cache Redis de evidências clínicas (PubMed/GPT).
    /// Útil após fix de rate limiting ou quando cache tem resultados vazios envenenados.
    /// </summary>
    [HttpPost("clear-evidence-cache")]
    public async Task<IActionResult> ClearEvidenceCache(CancellationToken ct)
    {
        var authResult = ValidateAdminKey();
        if (authResult != null)
            return authResult;

        var callerId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
        logger.LogWarning(
            "[AdminMigration][AUDIT] Clinical evidence cache clear requested. CallerUserId={CallerUserId} IP={Ip}",
            callerId, HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        var deleted = await clinicalEvidenceService.ClearCacheAsync(ct);

        return Ok(new { cleared = deleted, message = $"{deleted} cache entries removed" });
    }

    /// <summary>
    /// Validates the X-Admin-Key header with a timing-safe comparison.
    /// Returns null when valid, otherwise an <see cref="IActionResult"/> describing the error.
    /// </summary>
    private IActionResult? ValidateAdminKey()
    {
        var expectedKey = configuration["ADMIN_MIGRATION_KEY"]
            ?? Environment.GetEnvironmentVariable("ADMIN_MIGRATION_KEY");

        if (string.IsNullOrWhiteSpace(expectedKey))
            return StatusCode(503, new { error = "ADMIN_MIGRATION_KEY not configured." });

        var providedKey = Request.Headers["X-Admin-Key"].ToString();
        if (string.IsNullOrEmpty(providedKey))
            return Unauthorized(new { error = "Invalid X-Admin-Key." });

        var expectedBytes = Encoding.UTF8.GetBytes(expectedKey);
        var providedBytes = Encoding.UTF8.GetBytes(providedKey);

        // Length-safe: pad to avoid FixedTimeEquals length mismatch leaking via exception path
        if (expectedBytes.Length != providedBytes.Length)
        {
            // Still perform a constant-time compare against expected to avoid short-circuit timing.
            _ = CryptographicOperations.FixedTimeEquals(expectedBytes, expectedBytes);
            return Unauthorized(new { error = "Invalid X-Admin-Key." });
        }

        if (!CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes))
            return Unauthorized(new { error = "Invalid X-Admin-Key." });

        return null;
    }
}
