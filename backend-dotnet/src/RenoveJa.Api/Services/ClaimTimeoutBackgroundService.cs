using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Api.Services;

/// <summary>
/// Background service que libera claims "stale" — pedidos que um médico pegou
/// mas não finalizou dentro do timeout de 10 minutos. O pedido volta pra fila
/// global e qualquer médico pode pegar novamente.
///
/// Roda a cada 1 minuto. O UPDATE no Postgres é idempotente (WHERE claimed_at &lt; NOW() - interval),
/// então mesmo em multi-instância não há corrupção — apenas eventos SignalR duplicados
/// (ver dívida técnica alinhada com batch sign).
/// </summary>
public sealed class ClaimTimeoutBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<ClaimTimeoutBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan ClaimTimeout = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan SweepInterval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "ClaimTimeoutBackgroundService started. Timeout={Timeout}, Sweep={Sweep}",
            ClaimTimeout, SweepInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<IRequestRepository>();
                var publisher = scope.ServiceProvider.GetRequiredService<IRequestEventsPublisher>();

                var released = await repo.ReleaseStaleClaimsAsync(ClaimTimeout, stoppingToken);

                if (released.Count > 0)
                {
                    logger.LogInformation(
                        "ClaimTimeoutBackgroundService released {Count} stale claim(s): {Ids}",
                        released.Count, string.Join(", ", released));

                    foreach (var id in released)
                    {
                        try
                        {
                            await publisher.NotifyRequestReleasedAsync(id, stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            logger.LogWarning(ex,
                                "Failed to publish RequestReleased for {RequestId}", id);
                        }
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "ClaimTimeoutBackgroundService sweep failed");
            }

            try
            {
                await Task.Delay(SweepInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        logger.LogInformation("ClaimTimeoutBackgroundService stopped.");
    }
}
