namespace RenoveJa.Domain.Interfaces;

public interface IOutboxEventRepository
{
    Task<bool> ExistsByIdempotencyKeyAsync(string idempotencyKey, CancellationToken cancellationToken = default);
    Task<Guid> CreatePendingAsync(
        string aggregateType,
        Guid aggregateId,
        string eventType,
        string payloadJson,
        string idempotencyKey,
        CancellationToken cancellationToken = default);
    Task MarkProcessedAsync(Guid id, CancellationToken cancellationToken = default);
}
