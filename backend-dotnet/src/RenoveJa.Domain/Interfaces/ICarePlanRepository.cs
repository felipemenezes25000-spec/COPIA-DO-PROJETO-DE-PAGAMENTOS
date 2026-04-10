using RenoveJa.Domain.Entities;

namespace RenoveJa.Domain.Interfaces;

public interface ICarePlanRepository
{
    Task<CarePlan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CarePlan?> GetActiveByConsultationIdAsync(Guid consultationId, CancellationToken cancellationToken = default);
    Task<CarePlan> CreateAsync(CarePlan carePlan, CancellationToken cancellationToken = default);
    Task<CarePlan> UpdateAsync(CarePlan carePlan, CancellationToken cancellationToken = default);
}
