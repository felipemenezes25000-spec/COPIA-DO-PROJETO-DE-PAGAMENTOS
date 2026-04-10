using Microsoft.AspNetCore.SignalR;
using RenoveJa.Application.Interfaces;
using RenoveJa.Api.Hubs;

namespace RenoveJa.Api.Services;

/// <summary>
/// Implementação de IRequestEventsPublisher que envia eventos via SignalR para os grupos user_{userId}.
/// </summary>
public class RequestEventsPublisher(IHubContext<RequestsHub> hubContext, ILogger<RequestEventsPublisher> logger) : IRequestEventsPublisher
{
    public const string EventName = "RequestUpdated";

    public async Task NotifyRequestUpdatedAsync(
        Guid requestId,
        Guid? patientId,
        Guid? doctorId,
        string status,
        string? message = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new
            {
                requestId = requestId.ToString(),
                status,
                message
            };

            var groups = new List<string>();
            if (patientId.HasValue) groups.Add(RequestsHub.UserGroupName(patientId.Value));
            if (doctorId.HasValue && doctorId.Value != patientId) groups.Add(RequestsHub.UserGroupName(doctorId.Value));

            if (groups.Count == 0)
                return;

            foreach (var group in groups.Distinct())
            {
                await hubContext.Clients.Group(group).SendAsync(EventName, payload, cancellationToken);
            }

            logger.LogDebug("RequestEvents: sent {Event} for request {RequestId} status={Status} to {Count} group(s)", EventName, requestId, status, groups.Count);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "RequestEvents: failed to send for request {RequestId}", requestId);
        }
    }

    public async Task NotifyNewRequestToDoctorsAsync(
        Guid requestId,
        string status,
        string? message = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new
            {
                requestId = requestId.ToString(),
                status,
                message
            };

            await hubContext.Clients.Group(RequestsHub.DoctorsGroupName).SendAsync(EventName, payload, cancellationToken);
            logger.LogDebug("RequestEvents: sent {Event} for new request {RequestId} to doctors group", EventName, requestId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "RequestEvents: failed to notify doctors of new request {RequestId}", requestId);
        }
    }

    /// <summary>
    /// Nome do evento SignalR para conclusão de assinatura em lote.
    /// Clientes mobile/web devem subscrever a este nome para invalidar
    /// o cache de pedidos após um batch sign bem-sucedido.
    /// </summary>
    public const string BatchSignCompletedEvent = "BatchSignCompleted";

    public async Task NotifyBatchSignCompletedAsync(
        Guid doctorUserId,
        Guid batchId,
        int signedCount,
        int failedCount,
        IReadOnlyCollection<Guid> signedRequestIds,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new
            {
                batchId = batchId.ToString(),
                signedCount,
                failedCount,
                // IDs dos pedidos assinados para que outros devices invalidem
                // exatamente essas entradas do cache sem precisar refetch geral.
                signedRequestIds = signedRequestIds.Select(id => id.ToString()).ToArray(),
                timestamp = DateTime.UtcNow,
            };

            var group = RequestsHub.UserGroupName(doctorUserId);
            await hubContext.Clients.Group(group).SendAsync(BatchSignCompletedEvent, payload, cancellationToken);

            logger.LogDebug(
                "RequestEvents: sent {Event} batch={BatchId} signed={Signed} failed={Failed} to doctor {DoctorId}",
                BatchSignCompletedEvent, batchId, signedCount, failedCount, doctorUserId);
        }
        catch (Exception ex)
        {
            // Fail-safe: a falha em notificar não compromete a assinatura, já
            // gravada no banco. Outros devices vão eventualmente pegar o novo
            // estado via polling. Mas logamos Warning para detectar se o hub
            // estiver degradado.
            logger.LogWarning(ex,
                "RequestEvents: failed to send BatchSignCompleted for batch {BatchId} doctor {DoctorId}",
                batchId, doctorUserId);
        }
    }

    public const string RequestClaimedEvent = "RequestClaimed";
    public const string RequestReleasedEvent = "RequestReleased";

    public async Task NotifyRequestClaimedAsync(
        Guid requestId,
        string claimedByDoctorName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new
            {
                requestId = requestId.ToString(),
                claimedByDoctorName,
                claimedAt = DateTime.UtcNow
            };

            await hubContext.Clients
                .Group(RequestsHub.DoctorsGroupName)
                .SendAsync(RequestClaimedEvent, payload, cancellationToken);

            logger.LogDebug(
                "RequestEvents: sent {Event} for request {RequestId} by {Doctor}",
                RequestClaimedEvent, requestId, claimedByDoctorName);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "RequestEvents: failed to send RequestClaimed for {RequestId}", requestId);
        }
    }

    public async Task NotifyRequestReleasedAsync(
        Guid requestId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new { requestId = requestId.ToString() };

            await hubContext.Clients
                .Group(RequestsHub.DoctorsGroupName)
                .SendAsync(RequestReleasedEvent, payload, cancellationToken);

            logger.LogDebug(
                "RequestEvents: sent {Event} for request {RequestId}",
                RequestReleasedEvent, requestId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "RequestEvents: failed to send RequestReleased for {RequestId}", requestId);
        }
    }
}
