using RenoveJa.Application.DTOs.Requests;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Assinatura em lote de documentos médicos.
/// Fluxo: Revisar → Aprovar → Acumular → Assinar todos de uma vez.
/// </summary>
public interface IBatchSignatureService
{
    /// <summary>Marca um request como "revisado" pelo médico.</summary>
    Task<bool> MarkAsReviewedAsync(Guid doctorUserId, Guid requestId, CancellationToken ct);

    /// <summary>Aprova um request para assinatura em lote.</summary>
    Task<(bool success, string? error)> ApproveForSigningAsync(Guid doctorUserId, Guid requestId, CancellationToken ct);

    /// <summary>Revisa e aprova em uma única operação.</summary>
    Task<(bool success, string? error)> ReviewAndApproveAsync(Guid doctorUserId, Guid requestId, CancellationToken ct);

    /// <summary>Retorna IDs dos requests aprovados para assinatura pelo médico.</summary>
    Task<List<Guid>> GetApprovedRequestIdsAsync(Guid doctorUserId, CancellationToken ct);

    /// <summary>Assina em lote todos os requests aprovados.</summary>
    Task<BatchSignatureResult> SignBatchAsync(Guid doctorUserId, List<Guid> requestIds, string? pfxPassword, CancellationToken ct);
}
