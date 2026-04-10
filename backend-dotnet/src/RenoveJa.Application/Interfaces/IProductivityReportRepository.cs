using RenoveJa.Application.DTOs.Productivity;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Repositório de leitura-somente para o Monitor de Produtividade.
/// </summary>
public interface IProductivityReportRepository
{
    Task<OverviewDto> GetOverviewAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task<List<DoctorProductivityRow>> GetDoctorRankingAsync(DateTime fromUtc, DateTime toUtc, string sort, int limit, CancellationToken ct = default);
    Task<DoctorDetailDto?> GetDoctorDetailAsync(Guid doctorProfileId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task<FunnelDto> GetFunnelAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task<SlaDto> GetSlaAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task<LiveQueueDto> GetLiveQueueAsync(CancellationToken ct = default);
}
