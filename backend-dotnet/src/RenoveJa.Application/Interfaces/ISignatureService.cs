using RenoveJa.Application.DTOs.Requests;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Assinatura digital, geração de PDF, validação de conformidade e entrega de documentos.
/// </summary>
public interface ISignatureService
{
    Task<RequestResponseDto> SignAsync(
        Guid id,
        SignRequestDto dto,
        CancellationToken cancellationToken = default);

    Task<byte[]?> GetSignedDocumentAsync(
        Guid id, Guid userId, CancellationToken cancellationToken = default);

    Task<byte[]?> GetSignedDocumentByTokenAsync(
        Guid id, string? token, CancellationToken cancellationToken = default);

    Task<byte[]?> GetRequestImageAsync(
        Guid id, string? token, Guid? userId, string imageType, int index, CancellationToken cancellationToken = default);

    Task<RequestResponseDto> MarkDeliveredAsync(
        Guid id, Guid userId, CancellationToken cancellationToken = default);

    Task<(bool IsValid, IReadOnlyList<string> MissingFields, IReadOnlyList<string> Messages)> ValidatePrescriptionAsync(
        Guid id, Guid userId, CancellationToken cancellationToken = default);

    Task<byte[]?> GetPrescriptionPdfPreviewAsync(
        Guid id, Guid userId, CancellationToken cancellationToken = default);

    Task<byte[]?> GetExamPdfPreviewAsync(
        Guid id, Guid userId, CancellationToken cancellationToken = default);
}
