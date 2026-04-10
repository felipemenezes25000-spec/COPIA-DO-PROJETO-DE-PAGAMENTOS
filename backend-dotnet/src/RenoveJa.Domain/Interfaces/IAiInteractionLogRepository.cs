using RenoveJa.Domain.Entities;

namespace RenoveJa.Domain.Interfaces;

public interface IAiInteractionLogRepository
{
    Task LogAsync(AiInteractionLog log, CancellationToken cancellationToken = default);
}
