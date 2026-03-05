using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RenoveJa.Api.Hubs;

/// <summary>
/// Hub SignalR para eventos de solicitações em tempo real.
/// Cliente conecta e é adicionado ao grupo "user_{userId}"; médicos também entram em "doctors" para receber novas solicitações.
/// Conexão: /hubs/requests?access_token=...
/// </summary>
[Authorize]
public class RequestsHub : Hub
{
    public static string UserGroupName(Guid userId) => $"user_{userId:N}";
    public const string DoctorsGroupName = "doctors";

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var userGuid))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroupName(userGuid));
        }

        if (Context.User?.IsInRole("doctor") == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, DoctorsGroupName);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
