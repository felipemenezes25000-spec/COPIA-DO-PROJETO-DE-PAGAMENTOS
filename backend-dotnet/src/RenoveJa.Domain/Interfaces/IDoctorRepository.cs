using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;

namespace RenoveJa.Domain.Interfaces;

/// <summary>
/// Candidato a receber atribuição de solicitação. Contém os dados mínimos
/// (join de doctor_profiles + users) para o serviço de roteamento decidir sem
/// precisar de roundtrips adicionais.
/// </summary>
public sealed record DoctorAssignmentCandidate(
    Guid DoctorProfileId,
    Guid UserId,
    string Name,
    string Specialty);

public interface IDoctorRepository
{
    Task<DoctorProfile?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<DoctorProfile?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<List<DoctorProfile>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<List<DoctorProfile>> GetBySpecialtyAsync(string specialty, CancellationToken cancellationToken = default);
    Task<List<DoctorProfile>> GetAvailableAsync(string? specialty = null, CancellationToken cancellationToken = default);
    Task<(List<DoctorProfile> Items, int TotalCount)> GetPagedAsync(string? specialty, bool? available, int offset, int limit, CancellationToken cancellationToken = default);
    Task<(List<DoctorProfile> Items, int TotalCount)> GetPagedByApprovalStatusAsync(DoctorApprovalStatus? approvalStatus, int offset, int limit, CancellationToken cancellationToken = default);
    Task<DoctorProfile> CreateAsync(DoctorProfile doctorProfile, CancellationToken cancellationToken = default);
    Task<DoctorProfile> UpdateAsync(DoctorProfile doctorProfile, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Seleciona o médico menos carregado entre os disponíveis + aprovados.
    /// Se <paramref name="specialty"/> for fornecida, filtra estritamente por ela
    /// (retorna null se nenhum médico da especialidade estiver disponível — comportamento
    /// intencional para evitar roteamento para fora da especialidade exigida).
    /// Ordenação: total_consultations ASC, last_assigned_at ASC NULLS FIRST.
    /// </summary>
    Task<DoctorAssignmentCandidate?> SelectLeastLoadedAvailableAsync(
        string? specialty,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Marca o <c>last_assigned_at</c> do médico como agora. Chamado pelo serviço de
    /// roteamento imediatamente após uma atribuição bem-sucedida (efeito no balanceamento
    /// de carga das próximas seleções).
    /// </summary>
    Task UpdateLastAssignedAtAsync(
        Guid doctorProfileId,
        DateTime timestampUtc,
        CancellationToken cancellationToken = default);
}
