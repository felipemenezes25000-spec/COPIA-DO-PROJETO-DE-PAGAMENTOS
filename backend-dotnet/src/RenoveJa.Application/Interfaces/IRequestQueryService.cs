using RenoveJa.Application.DTOs;
using RenoveJa.Application.DTOs.Requests;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Métodos de leitura/consulta de solicitações médicas.
/// </summary>
public interface IRequestQueryService
{
    Task<List<RequestResponseDto>> GetUserRequestsAsync(
        Guid userId,
        string? status = null,
        string? type = null,
        CancellationToken cancellationToken = default);

    Task<PagedResponse<RequestResponseDto>> GetUserRequestsPagedAsync(
        Guid userId,
        string? status = null,
        string? type = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<RequestResponseDto> GetRequestByIdAsync(
        Guid id,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<List<RequestResponseDto>> GetPatientRequestsAsync(
        Guid doctorId,
        Guid patientId,
        CancellationToken cancellationToken = default);

    Task<PatientProfileForDoctorDto?> GetPatientProfileForDoctorAsync(
        Guid doctorId,
        Guid patientId,
        CancellationToken cancellationToken = default);

    Task<(int PendingCount, int InReviewCount, int CompletedCount, decimal TotalEarnings)> GetDoctorStatsAsync(
        Guid doctorId,
        CancellationToken cancellationToken = default);
}
