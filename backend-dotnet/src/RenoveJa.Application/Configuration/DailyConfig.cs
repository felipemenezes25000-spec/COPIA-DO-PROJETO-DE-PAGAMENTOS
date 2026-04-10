namespace RenoveJa.Application.Configuration;

/// <summary>
/// Configuração para integração com Daily.co (videochamada).
/// Variáveis de ambiente: DAILY_API_KEY, DAILY_DOMAIN (ex: "renove").
/// A URL base das salas será: https://{Domain}.daily.co/{roomName}
/// </summary>
public class DailyConfig
{
    /// <summary>API key do Daily.co (encontrada em Dashboard → Developers).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Subdomínio do Daily (ex: "renove" → https://renove.daily.co/*).</summary>
    public string Domain { get; set; } = string.Empty;

    /// <summary>Prefixo para nomes de sala (evita colisão se usar múltiplos ambientes).</summary>
    public string RoomPrefix { get; set; } = "consult";

    /// <summary>Minutos até a sala expirar automaticamente (padrão: 120 = 2h).</summary>
    public int DefaultRoomExpiryMinutes { get; set; } = 120;

    /// <summary>Minutos antes da expiração para renovar o token de meeting (padrão: 10).</summary>
    public int TokenRefreshThresholdMinutes { get; set; } = 10;

    /// <summary>Secret para validação de webhooks Daily.co.</summary>
    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>Idade máxima em segundos para aceitar evento de webhook (anti-replay).</summary>
    public int WebhookMaxEventAgeSeconds { get; set; } = 300;

    /// <summary>
    /// Gera o nome da sala dado o requestId.
    /// Convenção: room_name = "consult-{requestId:N}" (ex: consult-550e8400e29b41d4a716446655440000).
    /// Para obter request_id a partir de room_name: remover prefixo "consult-", inserir hífens nas posições 8,12,16,20 e Guid.Parse.
    /// Usado para identificar gravações na auditoria (GET /recordings?room_name=...).
    /// </summary>
    public string GetRoomName(Guid requestId) => $"{RoomPrefix}-{requestId:N}";
}
