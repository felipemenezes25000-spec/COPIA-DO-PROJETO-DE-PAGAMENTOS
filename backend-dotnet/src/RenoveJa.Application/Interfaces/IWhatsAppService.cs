namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Serviço para envio de mensagens/documentos via WhatsApp Business Cloud API.
/// </summary>
public interface IWhatsAppService
{
    /// <summary>
    /// Envia um documento PDF para o número informado.
    /// O número deve estar no formato E.164 (ex: 5511999999999).
    /// Retorna true se enviado com sucesso; false se não configurado ou erro.
    /// </summary>
    Task<(bool Success, string? ErrorMessage)> SendDocumentAsync(
        string phoneNumber,
        byte[] pdfBytes,
        string filename,
        string? caption = null,
        CancellationToken cancellationToken = default);
}
