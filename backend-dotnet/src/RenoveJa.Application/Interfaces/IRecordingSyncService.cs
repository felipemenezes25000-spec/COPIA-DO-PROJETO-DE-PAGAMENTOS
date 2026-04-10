namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Fallback para sincronizar gravação de consulta com S3.
/// </summary>
public interface IRecordingSyncService
{
    /// <summary>Tenta sincronizar a gravação da consulta com o storage.</summary>
    Task<bool> TrySyncRecordingAsync(Guid requestId, CancellationToken cancellationToken = default);
}
