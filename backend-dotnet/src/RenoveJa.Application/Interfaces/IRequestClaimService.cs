using RenoveJa.Application.DTOs.Requests;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Serviço de reivindicação (claim) de solicitações por médicos.
/// </summary>
public interface IRequestClaimService
{
    /// <summary>Médico reivindica (claim) um pedido da fila.</summary>
    Task<ClaimResult> ClaimAsync(Guid requestId, Guid doctorId, CancellationToken cancellationToken = default);
}
