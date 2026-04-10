using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Domain.Entities;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Serviço de aprovação e rejeição de solicitações.
/// Extraído do RequestService para reduzir acoplamento e facilitar manutenção.
/// </summary>
public interface IRequestApprovalService
{
    Task<MedicalRequest> ApproveAsync(
        Guid id,
        ApproveRequestDto dto,
        Guid doctorId,
        CancellationToken cancellationToken = default);

    Task<MedicalRequest> RejectAsync(
        Guid id,
        RejectRequestDto dto,
        Guid doctorId,
        CancellationToken cancellationToken = default);

    /// <summary>Reabre pedido rejeitado pela IA para análise médica.</summary>
    Task<MedicalRequest> ReopenFromAiRejectionAsync(
        Guid id,
        Guid doctorId,
        CancellationToken cancellationToken = default);
}
