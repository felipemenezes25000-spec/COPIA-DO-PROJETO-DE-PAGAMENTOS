namespace RenoveJa.Application.Configuration;

/// <summary>
/// Configuração para login com Google (Client ID do OAuth 2.0).
/// </summary>
public class GoogleAuthConfig
{
    /// <summary>Client ID do aplicativo Google (Console do Google Cloud → Credenciais → ID do cliente OAuth 2.0).</summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>Client ID Android (opcional). Se definido, é aceito como audience válido além do ClientId principal.</summary>
    public string AndroidClientId { get; set; } = string.Empty;
}
