namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Publica eventos em tempo real quando o status de uma solicitação ou pagamento muda,
/// para que paciente e médico recebam atualizações sem precisar dar refresh.
/// Implementado na API com SignalR (hub /hubs/requests).
/// </summary>
public interface IRequestEventsPublisher
{
    /// <summary>
    /// Notifica paciente e/ou médico que uma solicitação foi atualizada (status, assinatura, etc.).
    /// Envia evento "RequestUpdated" para os grupos do SignalR dos usuários envolvidos.
    /// </summary>
    /// <param name="requestId">Id da solicitação.</param>
    /// <param name="patientId">Id do paciente (recebe evento).</param>
    /// <param name="doctorId">Id do médico, se houver (recebe evento).</param>
    /// <param name="status">Status em snake_case (ex: approved_pending_payment, paid, signed).</param>
    /// <param name="message">Mensagem opcional para exibir (ex: "Documento assinado").</param>
    /// <param name="cancellationToken">Cancelamento.</param>
    Task NotifyRequestUpdatedAsync(
        Guid requestId,
        Guid? patientId,
        Guid? doctorId,
        string status,
        string? message = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Notifica todos os médicos conectados sobre uma nova solicitação na fila (tempo real, sem delay).
    /// </summary>
    Task NotifyNewRequestToDoctorsAsync(
        Guid requestId,
        string status,
        string? message = null,
        CancellationToken cancellationToken = default);
}
