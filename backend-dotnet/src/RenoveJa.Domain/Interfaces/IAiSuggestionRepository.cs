using RenoveJa.Domain.Entities;

namespace RenoveJa.Domain.Interfaces;

public interface IAiSuggestionRepository
{
    Task<AiSuggestion?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<AiSuggestion>> GetByConsultationAsync(Guid consultationId, IReadOnlyCollection<string>? statuses = null, CancellationToken cancellationToken = default);
    Task<AiSuggestion?> GetByIdempotencyAsync(Guid consultationId, Guid? doctorId, string payloadHash, CancellationToken cancellationToken = default);
    Task<AiSuggestion> CreateAsync(AiSuggestion suggestion, CancellationToken cancellationToken = default);
    Task<AiSuggestion> UpdateAsync(AiSuggestion suggestion, CancellationToken cancellationToken = default);
}
