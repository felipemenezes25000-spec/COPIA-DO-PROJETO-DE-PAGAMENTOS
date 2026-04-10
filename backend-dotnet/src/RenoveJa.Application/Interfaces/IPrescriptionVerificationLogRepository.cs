namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Log de verificações e downloads de receitas (anti-fraude, auditoria LGPD).
/// </summary>
public interface IPrescriptionVerificationLogRepository
{
    Task LogAsync(Guid prescriptionId, string action, string outcome, string? ipAddress, string? userAgent, CancellationToken ct = default);
    Task<int> GetDownloadCountAsync(Guid prescriptionId, CancellationToken ct = default);
}
