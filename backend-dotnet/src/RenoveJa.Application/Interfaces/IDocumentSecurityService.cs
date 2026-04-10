using RenoveJa.Domain.Enums;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Controle antifraude de documentos médicos:
/// - Cálculo automático de validade (expires_at)
/// - Dispensação (marcar como usado na farmácia)
/// - Verificação universal (receitas, atestados, exames)
/// - Log de acesso (auditoria LGPD)
/// </summary>
public interface IDocumentSecurityService
{
    /// <summary>Calcula a data de validade baseada no tipo de documento.</summary>
    DateTime CalculateExpiresAt(DocumentType docType, string? prescriptionKind, DateTime issuedAt);

    /// <summary>Calcula max_dispenses baseado no tipo.</summary>
    int CalculateMaxDispenses(DocumentType docType, string? prescriptionKind);

    /// <summary>Gera código de acesso de 6 dígitos + hash para verificação.</summary>
    (string code, string hash) GenerateVerifyCode();

    /// <summary>Valida código de verificação contra o hash armazenado.</summary>
    bool ValidateVerifyCode(string code, string storedHash);

    /// <summary>Registra dispensação do documento.</summary>
    Task<(bool success, string? error)> RecordDispensationAsync(
        Guid documentId, string dispensedBy, string? pharmacistName, string? pharmacistCrf, string? ip, CancellationToken ct);

    /// <summary>Loga acesso a documento (download, visualização, verificação).</summary>
    Task LogAccessAsync(
        Guid? documentId, Guid? requestId, Guid? userId,
        string action, string actorType, string? ip, string? userAgent,
        CancellationToken ct);
}
