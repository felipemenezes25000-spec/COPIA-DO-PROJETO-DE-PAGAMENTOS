using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RenoveJa.Application.DTOs.Productivity;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Monitor de Produtividade Médica consumido pelo portal RH
/// (<c>https://rh.renovejasaude.com.br/admin</c>).
///
/// Todos os endpoints são de LEITURA-SOMENTE e agregam dados já existentes em
/// <c>public.requests</c> e <c>public.document_access_log</c>.
///
/// Cache HTTP de 10s com <c>stale-while-revalidate</c> é aplicado para que
/// múltiplos admins logados ao mesmo tempo não multipliquem a carga no banco.
///
/// Spec: docs/superpowers/specs/2026-04-09-monitor-produtividade-medica-design.md
/// </summary>
[ApiController]
[Route("api/admin/productivity")]
[Authorize(Roles = "admin")]
[EnableRateLimiting("admin")]
public class AdminProductivityController(
    IProductivityReportRepository reportRepository,
    ILogger<AdminProductivityController> logger) : ControllerBase
{
    private const int DefaultLookbackDays = 30;

    private (DateTime from, DateTime to) ResolvePeriod(DateTime? from, DateTime? to)
    {
        var utcTo = (to ?? DateTime.UtcNow).ToUniversalTime();
        var utcFrom = (from ?? utcTo.AddDays(-DefaultLookbackDays)).ToUniversalTime();
        if (utcFrom > utcTo) (utcFrom, utcTo) = (utcTo, utcFrom);
        return (utcFrom, utcTo);
    }

    private void ApplyCacheHeaders(int maxAgeSeconds = 10, int swrSeconds = 20)
    {
        Response.Headers.CacheControl = $"private, max-age={maxAgeSeconds}, stale-while-revalidate={swrSeconds}";
    }

    [HttpGet("overview")]
    public async Task<ActionResult<OverviewDto>> GetOverview(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var (utcFrom, utcTo) = ResolvePeriod(from, to);
        var overview = await reportRepository.GetOverviewAsync(utcFrom, utcTo, ct);
        ApplyCacheHeaders();
        return Ok(overview);
    }

    [HttpGet("doctors")]
    public async Task<ActionResult<IReadOnlyList<DoctorProductivityRow>>> GetDoctors(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? sort = "revenue",
        [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        var (utcFrom, utcTo) = ResolvePeriod(from, to);
        var safeLimit = Math.Clamp(limit, 1, 200);
        var rows = await reportRepository.GetDoctorRankingAsync(utcFrom, utcTo, sort ?? "revenue", safeLimit, ct);
        ApplyCacheHeaders();
        return Ok(rows);
    }

    [HttpGet("doctors/{doctorProfileId:guid}")]
    public async Task<ActionResult<DoctorDetailDto>> GetDoctorDetail(
        Guid doctorProfileId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var (utcFrom, utcTo) = ResolvePeriod(from, to);
        var detail = await reportRepository.GetDoctorDetailAsync(doctorProfileId, utcFrom, utcTo, ct);
        if (detail is null)
            return NotFound(new { error = "Médico não encontrado." });
        ApplyCacheHeaders();
        return Ok(detail);
    }

    [HttpGet("funnel")]
    public async Task<ActionResult<FunnelDto>> GetFunnel(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var (utcFrom, utcTo) = ResolvePeriod(from, to);
        var funnel = await reportRepository.GetFunnelAsync(utcFrom, utcTo, ct);
        ApplyCacheHeaders();
        return Ok(funnel);
    }

    [HttpGet("sla")]
    public async Task<ActionResult<SlaDto>> GetSla(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var (utcFrom, utcTo) = ResolvePeriod(from, to);
        var sla = await reportRepository.GetSlaAsync(utcFrom, utcTo, ct);
        ApplyCacheHeaders();
        return Ok(sla);
    }

    /// <summary>
    /// Endpoint de polling ao vivo. Retorna o estado atual da fila de pedidos
    /// pendentes, médicos online e alertas de SLA violado. O frontend RH chama
    /// este endpoint com intervalo adaptativo (10s visível, 60s idle, pausa em
    /// background tab) via <c>useAdaptivePolling</c>.
    /// </summary>
    [HttpGet("queue/live")]
    public async Task<ActionResult<LiveQueueDto>> GetLiveQueue(CancellationToken ct)
    {
        var live = await reportRepository.GetLiveQueueAsync(ct);
        // Cache mais curto (5s) porque é tempo real — stale-while-revalidate
        // evita que N admins disparem N queries simultâneas.
        ApplyCacheHeaders(maxAgeSeconds: 5, swrSeconds: 10);
        return Ok(live);
    }

    /// <summary>
    /// Download de relatório completo (CSV). PDF fica para fase 2 — por
    /// enquanto, o frontend só precisa do CSV para abrir no Excel.
    /// </summary>
    [HttpGet("reports/export")]
    public async Task<IActionResult> ExportReport(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string format = "csv",
        CancellationToken ct = default)
    {
        if (!string.Equals(format, "csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Formato não suportado. Use format=csv." });

        var (utcFrom, utcTo) = ResolvePeriod(from, to);
        var rows = await reportRepository.GetDoctorRankingAsync(utcFrom, utcTo, "revenue", 500, ct);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("doctor_profile_id,user_id,name,specialty,requests_handled,reviewed,signed,batch_signed,p50_min_to_sign,p95_min_to_sign,revenue_cents,idle_cost_cents,utilization_rate,batch_sign_rate,last_activity_at");
        foreach (var r in rows)
        {
            sb.Append(r.DoctorProfileId).Append(',')
              .Append(r.UserId).Append(',')
              .Append(CsvEscape(r.Name)).Append(',')
              .Append(CsvEscape(r.Specialty)).Append(',')
              .Append(r.RequestsHandled).Append(',')
              .Append(r.Reviewed).Append(',')
              .Append(r.Signed).Append(',')
              .Append(r.BatchSigned).Append(',')
              .Append(r.P50MinutesToSign.ToString(System.Globalization.CultureInfo.InvariantCulture)).Append(',')
              .Append(r.P95MinutesToSign.ToString(System.Globalization.CultureInfo.InvariantCulture)).Append(',')
              .Append(r.RevenueCents).Append(',')
              .Append(r.IdleCostCents).Append(',')
              .Append(r.UtilizationRate?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "").Append(',')
              .Append(r.BatchSignRate.ToString(System.Globalization.CultureInfo.InvariantCulture)).Append(',')
              .Append(r.LastActivityAt?.ToString("O") ?? "")
              .AppendLine();
        }

        logger.LogInformation("Productivity CSV export: {Rows} rows, period {From} → {To}",
            rows.Count, utcFrom, utcTo);

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        var filename = $"produtividade-medica-{utcFrom:yyyyMMdd}-{utcTo:yyyyMMdd}.csv";
        return File(bytes, "text/csv; charset=utf-8", filename);
    }

    private static string CsvEscape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        return value;
    }
}
