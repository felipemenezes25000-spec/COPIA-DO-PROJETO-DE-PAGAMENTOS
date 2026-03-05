using RenoveJa.Domain.Entities;

namespace RenoveJa.Domain.Interfaces;

public interface ICarePlanTaskRepository
{
    Task<CarePlanTask?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<CarePlanTask>> GetByCarePlanIdAsync(Guid carePlanId, CancellationToken cancellationToken = default);
    Task<CarePlanTask> CreateAsync(CarePlanTask task, CancellationToken cancellationToken = default);
    Task<CarePlanTask> UpdateAsync(CarePlanTask task, CancellationToken cancellationToken = default);

    Task<CarePlanTaskFile> CreateFileAsync(CarePlanTaskFile file, CancellationToken cancellationToken = default);
    Task<List<CarePlanTaskFile>> GetFilesByTaskIdAsync(Guid taskId, CancellationToken cancellationToken = default);
}
