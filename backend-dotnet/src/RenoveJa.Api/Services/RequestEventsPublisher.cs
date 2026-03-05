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
}
