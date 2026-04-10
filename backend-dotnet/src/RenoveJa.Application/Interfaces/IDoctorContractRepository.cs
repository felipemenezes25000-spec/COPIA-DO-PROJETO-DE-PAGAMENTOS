using RenoveJa.Application.DTOs.Productivity;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Repositório de contratos de médicos.
/// </summary>
public interface IDoctorContractRepository
{
    Task<DoctorContractDto?> GetActiveByDoctorAsync(Guid doctorProfileId, CancellationToken ct = default);
    Task<List<DoctorContractDto>> GetAllActiveAsync(CancellationToken ct = default);
    Task<DoctorContractDto> UpsertAsync(Guid doctorProfileId, UpsertDoctorContractDto dto, Guid? updatedBy, CancellationToken ct = default);
    Task<bool> DeactivateAsync(Guid doctorProfileId, Guid? updatedBy, CancellationToken ct = default);
}
