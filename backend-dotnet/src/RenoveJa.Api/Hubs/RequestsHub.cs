using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RenoveJa.Api.Hubs;

/// <summary>
/// Hub SignalR para eventos de solicitações em tempo real.
/// Cliente conecta e é adicionado ao grupo "user_{userId}"; o backend envia RequestUpdated para esses grupos.
/// Conexão: /hubs/requests?access_token=...
/// </summary>
[Authorize]
public class RequestsHub : Hub
{
    public static string UserGroupName(Guid userId) => $"user_{userId:N}";

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroupName(userGuid));
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
