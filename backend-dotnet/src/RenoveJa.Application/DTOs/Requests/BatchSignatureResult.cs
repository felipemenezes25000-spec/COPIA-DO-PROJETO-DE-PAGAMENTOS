namespace RenoveJa.Application.DTOs.Requests;

/// <summary>
/// Resultado de uma assinatura em lote.
/// </summary>
public record BatchSignatureResult(
    int SignedCount,
    int FailedCount,
    List<BatchSignatureItemResult> Items,
    string? Message = null);

/// <summary>
/// Resultado individual de cada item no lote de assinatura.
/// </summary>
public record BatchSignatureItemResult(
    Guid RequestId,
    bool Success,
    string? ErrorMessage = null);
