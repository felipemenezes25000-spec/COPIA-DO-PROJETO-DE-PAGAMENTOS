using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Api.Services;

/// <summary>
/// Phase E — Queue SLA expiration worker.
///
/// Varre periodicamente requests em <see cref="RequestStatus.SearchingDoctor"/> que
/// estão na fila há mais tempo que o SLA configurado. Para cada um, emite um log
/// de alerta com os campos estruturados (requestId, patientId, ageMinutes,
/// requiredSpecialty, priority) para que alertas/dashboards externos possam agir.
///
/// Não faz re-roteamento automático nesta versão: a intenção é dar visibilidade
/// (observability) da saúde da fila antes de ligar qualquer ação destrutiva.
/// Phase A já deixou a estratégia (<c>IRequestRoutingStrategy</c>) extensível para
/// que uma futura ação "expandir filtro de especialidade" possa ser plugada aqui.
/// </summary>
public sealed class QueueSlaExpirationWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<QueueSlaExpirationWorker> logger,
    IConfiguration configuration) : BackgroundService
{
    private static readonly TimeSpan DefaultScanInterval = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan DefaultSlaWarningAge = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan MinScanInterval = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan MaxScanInterval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var scanInterval = ParseTimeSpan(
            configuration["QueueSla:ScanInterval"], DefaultScanInterval);
        if (scanInterval < MinScanInterval || scanInterval > MaxScanInterval)
        {
            logger.LogWarning(
                "QueueSlaExpirationWorker: scanInterval={Configured} is out of bounds " +
                "[{Min}..{Max}]; clamping to default {Default}",
                scanInterval, MinScanInterval, MaxScanInterval, DefaultScanInterval);
            scanInterval = DefaultScanInterval;
        }
        var warningAge = ParseTimeSpan(
            configuration["QueueSla:WarningAge"], DefaultSlaWarningAge);

        logger.LogInformation(
            "QueueSlaExpirationWorker started: scanInterval={ScanInterval}, warningAge={WarningAge}",
            scanInterval, warningAge);

        // Delay inicial para não competir com migrations/warmup.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ScanOnceAsync(warningAge, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "QueueSlaExpirationWorker: scan failed; will retry next interval");
            }

            try { await Task.Delay(scanInterval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }

        logger.LogInformation("QueueSlaExpirationWorker stopped");
    }

    private const int ScanPageSize = 500;
    private const int ScanMaxPages = 200; // hard cap: 100k requests/scan

    private async Task ScanOnceAsync(TimeSpan warningAge, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var requestRepository = scope.ServiceProvider.GetRequiredService<IRequestRepository>();

        var now = DateTime.UtcNow;
        var totalQueued = 0;
        var breaches = 0;

        // Cursor-style pagination: avoids loading the entire queue into memory and
        // protects worker memory if the queue grows. Hard cap (ScanMaxPages) is a
        // safety net — beyond it we abort the scan and log so ops can investigate.
        for (var page = 0; page < ScanMaxPages; page++)
        {
            var batch = await requestRepository.GetByStatusPagedAsync(
                RequestStatus.SearchingDoctor,
                pageSize: ScanPageSize,
                offset: page * ScanPageSize,
                cancellationToken);

            if (batch.Count == 0) break;
            totalQueued += batch.Count;

            foreach (var req in batch)
            {
                var age = now - req.CreatedAt;
                if (age < warningAge) continue;

                breaches++;
                logger.LogWarning(
                    "QueueSLA breach: requestId={RequestId} patientId={PatientId} " +
                    "ageMinutes={AgeMinutes:F1} requiredSpecialty={RequiredSpecialty} priority={Priority}",
                    req.Id,
                    req.PatientId,
                    age.TotalMinutes,
                    req.RequiredSpecialty ?? "(any)",
                    req.Priority);
            }

            if (batch.Count < ScanPageSize) break;

            if (page == ScanMaxPages - 1)
            {
                logger.LogError(
                    "QueueSlaExpirationWorker: scan hit ScanMaxPages={MaxPages} (>{Total} requests). Aborting scan.",
                    ScanMaxPages, totalQueued);
            }
        }

        if (totalQueued == 0) return;

        if (breaches > 0)
        {
            logger.LogWarning(
                "QueueSlaExpirationWorker: {Breaches} request(s) breached SLA ({TotalQueued} total in queue)",
                breaches, totalQueued);
        }
        else
        {
            logger.LogDebug(
                "QueueSlaExpirationWorker: {TotalQueued} request(s) in queue, none over SLA",
                totalQueued);
        }
    }

    private static TimeSpan ParseTimeSpan(string? raw, TimeSpan fallback)
    {
        if (string.IsNullOrWhiteSpace(raw)) return fallback;
        if (TimeSpan.TryParse(raw, out var parsed) && parsed > TimeSpan.Zero) return parsed;
        if (int.TryParse(raw, out var seconds) && seconds > 0) return TimeSpan.FromSeconds(seconds);
        return fallback;
    }
}
