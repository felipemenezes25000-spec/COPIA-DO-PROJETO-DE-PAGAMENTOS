using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using RenoveJa.Application.DTOs.Consultation;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Api.Hubs;

/// <summary>
/// SignalR hub for WebRTC signaling: exchange SDP (offer/answer) and ICE candidates
/// between patient and doctor in a consultation room. Room is identified by requestId.
/// Ao entrar na sala, envia estado atual (transcript, anamnese, sugestões, evidências) para garantir que apareça.
/// </summary>
[Authorize]
public class VideoSignalingHub(
    IRequestRepository requestRepository,
    IConsultationSessionStore sessionStore,
    ILogger<VideoSignalingHub> logger) : Hub
{
    public static string GroupName(string requestId) => $"room_{requestId}";

    // Proteção contra flooding de mensagens de signaling (SDP/ICE) por conexão.
    // Limite: 200 mensagens por janela de 10 segundos. SDP offer/answer ocorre
    // 1-2 vezes por consulta; ICE candidates podem chegar em rajada (~30-60 por
    // peer), então 200/10s é folgado para uso legítimo mas barra abuso.
    private const int MaxMessagesPerWindow = 200;
    private static readonly TimeSpan FloodWindow = TimeSpan.FromSeconds(10);
    private static readonly ConcurrentDictionary<string, (DateTime WindowStart, int Count)> _floodCounters = new();

    private bool IsFlooding()
    {
        var connectionId = Context.ConnectionId;
        var now = DateTime.UtcNow;
        var entry = _floodCounters.AddOrUpdate(
            connectionId,
            _ => (now, 1),
            (_, existing) =>
            {
                if (now - existing.WindowStart > FloodWindow)
                    return (now, 1);
                return (existing.WindowStart, existing.Count + 1);
            });

        if (entry.Count > MaxMessagesPerWindow)
        {
            logger.LogWarning(
                "SignalR flood detected: connection {ConnectionId} exceeded {Max} msgs in {Window}s",
                connectionId, MaxMessagesPerWindow, FloodWindow.TotalSeconds);
            return true;
        }
        return false;
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Join the signaling room for the given request. Validates that the user is the patient or doctor of that request.
    /// Blocks joining if consultation is already finished (prevents chat after end).
    /// </summary>
    public async Task JoinRoom(string requestId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            await Clients.Caller.SendAsync("Error", "Unauthorized");
            return;
        }

        if (!Guid.TryParse(requestId, out var reqId))
        {
            await Clients.Caller.SendAsync("Error", "Invalid requestId");
            return;
        }

        var request = await requestRepository.GetByIdAsync(reqId);
        if (request == null)
        {
            await Clients.Caller.SendAsync("Error", "Request not found");
            return;
        }

        if (request.PatientId != userGuid && request.DoctorId != userGuid)
        {
            await Clients.Caller.SendAsync("Error", "You are not a participant of this consultation");
            return;
        }

        // Block joining if consultation already ended — prevents chat/signaling after finish
        var canJoin = request.Status is RequestStatus.InConsultation
            or RequestStatus.Paid
            or RequestStatus.ConsultationReady;
        if (!canJoin)
        {
            logger.LogWarning("User {UserId} tried to join finished consultation {RequestId} (status={Status})",
                userGuid, requestId, request.Status);
            await Clients.Caller.SendAsync("ConsultationEnded", requestId);
            return;
        }

        var normalizedId = reqId.ToString();
        var group = GroupName(normalizedId);
        await Groups.AddToGroupAsync(Context.ConnectionId, group);
        logger.LogInformation("User {UserId} joined video room {RequestId}", userGuid, normalizedId);

        // Sincronizar estado atual para garantir que anamnese, evidências e perguntas apareçam (evita tela vazia)
        // Chamadas Redis sequenciais — se a primeira falhar (Redis offline), pular as demais para não bloquear 3×timeout
        string transcript = string.Empty;
        string? anamnesisJson = null, suggestionsJson = null, evidenceJson = null;
        try
        {
            transcript = sessionStore.GetTranscript(reqId);
            (anamnesisJson, suggestionsJson) = sessionStore.GetAnamnesisState(reqId);
            evidenceJson = sessionStore.GetEvidenceJson(reqId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis indisponível ao sincronizar estado no JoinRoom — continuando sem estado. RequestId={RequestId}", requestId);
        }

        if (!string.IsNullOrEmpty(transcript))
            await Clients.Caller.SendAsync("TranscriptUpdate", new TranscriptUpdateDto(transcript));
        if (!string.IsNullOrEmpty(anamnesisJson))
            await Clients.Caller.SendAsync("AnamnesisUpdate", new AnamnesisUpdateDto(anamnesisJson));
        else
        {
            // Anamnese inicial com perguntas sugeridas para consulta em andamento (garante que sempre apareça)
            var initialAnamnesis = GetInitialAnamnesisJson();
            await Clients.Caller.SendAsync("AnamnesisUpdate", new AnamnesisUpdateDto(initialAnamnesis));
        }
        if (!string.IsNullOrEmpty(suggestionsJson))
        {
            try
            {
                var suggestions = JsonSerializer.Deserialize<string[]>(suggestionsJson);
                if (suggestions != null && suggestions.Length > 0)
                    await Clients.Caller.SendAsync("SuggestionUpdate", new SuggestionUpdateDto(suggestions));
            }
            catch { /* ignore parse */ }
        }
        // Enviar evidências clínicas armazenadas na sessão (fix: antes não eram enviadas no join)
        if (!string.IsNullOrEmpty(evidenceJson))
        {
            try
            {
                var evidenceItems = JsonSerializer.Deserialize<List<EvidenceItemDto>>(evidenceJson,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                if (evidenceItems != null && evidenceItems.Count > 0)
                    await Clients.Caller.SendAsync("EvidenceUpdate", new EvidenceUpdateDto(evidenceItems));
            }
            catch { /* ignore parse */ }
        }

        await Clients.Caller.SendAsync("Joined", requestId);
    }

    /// <summary>
    /// Send SDP offer to the other peer(s) in the room.
    /// </summary>
    public async Task SendOffer(string requestId, object sdp)
    {
        if (IsFlooding()) return;
        await SendToOthersInRoom(requestId, "Offer", sdp);
    }

    /// <summary>
    /// Send SDP answer to the other peer(s) in the room.
    /// </summary>
    public async Task SendAnswer(string requestId, object sdp)
    {
        if (IsFlooding()) return;
        await SendToOthersInRoom(requestId, "Answer", sdp);
    }

    /// <summary>
    /// Send ICE candidate to the other peer(s) in the room.
    /// </summary>
    public async Task SendIceCandidate(string requestId, object candidate)
    {
        if (IsFlooding()) return;
        await SendToOthersInRoom(requestId, "IceCandidate", candidate);
    }

    private async Task SendToOthersInRoom(string requestId, string method, object payload)
    {
        // Valida que o caller realmente é membro autorizado do grupo.
        // Sem isso, qualquer usuário autenticado poderia chamar SendOffer("requestId-alheio", ...)
        // e enviar mensagens para outras salas sem ter passado pelo JoinRoom (que valida owership).
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            return;
        if (!Guid.TryParse(requestId, out var reqId))
            return;

        var request = await requestRepository.GetByIdAsync(reqId);
        if (request == null) return;
        if (request.PatientId != userGuid && request.DoctorId != userGuid)
        {
            logger.LogWarning("User {UserId} tried to signal to room {RequestId} without being a participant",
                userGuid, reqId);
            return;
        }

        var normalizedId = reqId.ToString();
        var group = GroupName(normalizedId);
        await Clients.OthersInGroup(group).SendAsync(method, payload);
    }

    private static string GetInitialAnamnesisJson()
    {
        var perguntas = new[]
        {
            new { pergunta = "Qual é a sua queixa principal? O que está sentindo?", objetivo = "Identificar motivo da consulta", hipoteses_afetadas = "Define o eixo diagnóstico", impacto_na_conduta = "Determina investigação", prioridade = "alta" },
            new { pergunta = "Há quanto tempo está com isso? Começou de repente ou foi piorando?", objetivo = "Estabelecer cronologia", hipoteses_afetadas = "Agudo vs crônico", impacto_na_conduta = "Define urgência", prioridade = "alta" },
            new { pergunta = "De 0 a 10, qual a intensidade? Interfere nas atividades?", objetivo = "Quantificar gravidade", hipoteses_afetadas = "EVA", impacto_na_conduta = "Analgesia e exames", prioridade = "alta" },
            new { pergunta = "Está tomando algum remédio? Qual, dose e há quanto tempo?", objetivo = "Mapear farmacoterapia", hipoteses_afetadas = "Interações", impacto_na_conduta = "Evita interações", prioridade = "media" },
            new { pergunta = "Tem alergia a algum medicamento ou alimento?", objetivo = "Prevenir reações", hipoteses_afetadas = "Restringe opções", impacto_na_conduta = "Muda prescrição", prioridade = "media" },
        };
        return JsonSerializer.Serialize(new { perguntas_sugeridas = perguntas });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception != null)
            logger.LogWarning(exception, "Video signaling client disconnected");
        // Remove counter para evitar crescimento ilimitado do dicionário
        _floodCounters.TryRemove(Context.ConnectionId, out _);
        await base.OnDisconnectedAsync(exception);
    }
}
