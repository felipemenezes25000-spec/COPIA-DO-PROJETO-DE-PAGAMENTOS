namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Inicia a gravação de uma consulta (enfileira para o background worker).
/// </summary>
public interface IStartConsultationRecording
{
    /// <summary>Enfileira o início da gravação para o requestId.</summary>
    Task StartRecordingAsync(Guid requestId, CancellationToken ct = default);
}
