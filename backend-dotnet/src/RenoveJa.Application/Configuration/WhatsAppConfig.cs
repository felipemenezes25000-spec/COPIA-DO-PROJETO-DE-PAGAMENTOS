namespace RenoveJa.Application.Configuration;

/// <summary>
/// Configuração da WhatsApp Business Cloud API para envio automático de documentos.
/// </summary>
public class WhatsAppConfig
{
    public const string SectionName = "WhatsApp";

    /// <summary>Token de acesso da API (Meta Graph API).</summary>
    public string ApiToken { get; set; } = "";

    /// <summary>ID do número de telefone WhatsApp Business (phone_number_id).</summary>
    public string PhoneNumberId { get; set; } = "";

    /// <summary>Indica se o envio via WhatsApp está configurado e habilitado.</summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiToken) && !string.IsNullOrWhiteSpace(PhoneNumberId);
}
