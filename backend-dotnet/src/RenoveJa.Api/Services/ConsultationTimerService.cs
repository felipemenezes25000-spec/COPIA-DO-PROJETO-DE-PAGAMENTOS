using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services.Notifications;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Api.Services;

/// <summary>
/// Background service que monitora consultas em andamento e encerra automaticamente
/// quando o tempo contratado expira. Credita minutos nao utilizados ao banco de horas
/// do paciente.
/// </summary>
public sealed class ConsultationTimerService(
    IServiceScopeFactory scopeFactory,
    ILogger<ConsultationTimerService> logger) : BackgroundService
{
    private static readonly TimeSpan ScanInterval = TimeSpan.FromSeconds(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("ConsultationTimerService started: scanInterval={ScanInterval}", ScanInterval);

        // Delay inicial para nao competir com migrations/warmup.
        try { await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ScanAndEndExpiredConsultationsAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "ConsultationTimerService: scan failed; will retry next interval");
            }

            try { await Task.Delay(ScanInterval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }

        logger.LogInformation("ConsultationTimerService stopped");
    }

    private async Task ScanAndEndExpiredConsultationsAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var requestRepository = scope.ServiceProvider.GetRequiredService<IRequestRepository>();
        var timeBankRepository = scope.ServiceProvider.GetRequiredService<IConsultationTimeBankRepository>();
        var pushDispatcher = scope.ServiceProvider.GetRequiredService<IPushNotificationDispatcher>();

        var inConsultation = await requestRepository.GetByStatusAsync(
            RequestStatus.InConsultation, limit: 100, cancellationToken: cancellationToken);

        if (inConsultation.Count == 0) return;

        var now = DateTime.UtcNow;

        foreach (var request in inConsultation)
        {
            try
            {
                // Precisa de ConsultationStartedAt e ContractedMinutes para calcular expiracao
                if (!request.ConsultationStartedAt.HasValue || !request.ContractedMinutes.HasValue)
                    continue;

                var endTime = request.ConsultationStartedAt.Value.AddMinutes(request.ContractedMinutes.Value);
                if (now < endTime)
                    continue;

                // Tempo expirado — encerrar automaticamente
                logger.LogInformation(
                    "[CONSULTATION-TIMER] Encerrando consulta expirada. RequestId={RequestId}, StartedAt={StartedAt}, ContractedMinutes={ContractedMinutes}",
                    request.Id, request.ConsultationStartedAt.Value, request.ContractedMinutes.Value);

                request.EndConsultationCall("Consulta encerrada automaticamente por tempo.");
                await requestRepository.UpdateAsync(request, cancellationToken);

                // Calcular minutos nao utilizados e creditar no banco de horas
                var elapsedSeconds = (int)(now - request.ConsultationStartedAt.Value).TotalSeconds;
                var contractedSeconds = request.ContractedMinutes.Value * 60;
                var unusedSeconds = contractedSeconds - elapsedSeconds;
                var minutesCredited = 0;

                if (unusedSeconds > 0)
                {
                    var consultationType = request.ConsultationType ?? "clinico";
                    await timeBankRepository.CreditAsync(
                        request.PatientId,
                        consultationType,
                        unusedSeconds,
                        request.Id,
                        "Minutos nao utilizados creditados automaticamente",
                        cancellationToken);
                    minutesCredited = unusedSeconds / 60;
                    logger.LogInformation(
                        "[CONSULTATION-TIMER] Creditados {UnusedSeconds}s ({MinutesCredited} min) ao banco de horas. RequestId={RequestId}, PatientId={PatientId}",
                        unusedSeconds, minutesCredited, request.Id, request.PatientId);
                }

                // Notificar paciente
                await pushDispatcher.SendAsync(
                    PushNotificationRules.ConsultationAutoEnded(request.PatientId, request.Id, isDoctor: false, minutesCredited),
                    cancellationToken);

                // Notificar medico
                if (request.DoctorId.HasValue)
                {
                    await pushDispatcher.SendAsync(
                        PushNotificationRules.ConsultationAutoEnded(request.DoctorId.Value, request.Id, isDoctor: true, minutesCredited),
                        cancellationToken);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex,
                    "[CONSULTATION-TIMER] Falha ao encerrar consulta expirada. RequestId={RequestId}",
                    request.Id);
            }
        }
    }
}
