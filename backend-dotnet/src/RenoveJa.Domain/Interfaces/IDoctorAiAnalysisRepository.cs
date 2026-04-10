using RenoveJa.Domain.Entities;

namespace RenoveJa.Domain.Interfaces;

public interface IDoctorAiAnalysisRepository
{
    /// <summary>Retorna a análise mais recente para um candidato (doctor_profile_id), ou null.</summary>
    Task<DoctorAiAnalysis?> GetLatestByDoctorProfileAsync(Guid doctorProfileId, CancellationToken cancellationToken = default);

    /// <summary>Cria uma nova linha de análise. Histórico é preservado (sem delete de linhas antigas).</summary>
    Task<DoctorAiAnalysis> CreateAsync(DoctorAiAnalysis analysis, CancellationToken cancellationToken = default);

    /// <summary>Retorna todas as análises mais recentes (uma por candidato) — usado por dashboard/stats.</summary>
    Task<List<DoctorAiAnalysis>> GetAllLatestAsync(CancellationToken cancellationToken = default);
}
