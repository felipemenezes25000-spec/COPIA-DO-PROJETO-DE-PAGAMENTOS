using Microsoft.Extensions.Logging;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;
using System.Security.Cryptography;
using System.Text;

namespace RenoveJa.Application.Services;

/// <summary>
/// Controle antifraude de documentos médicos:
/// - Cálculo automático de validade (expires_at)
/// - Dispensação (marcar como usado na farmácia)
/// - Verificação universal (receitas, atestados, exames)
/// - Log de acesso (auditoria LGPD)
/// </summary>
public class DocumentSecurityService(
    IDocumentAccessLogRepository accessLogRepository,
    IMedicalDocumentRepository medicalDocumentRepository,
    ILogger<DocumentSecurityService> logger)
    : IDocumentSecurityService
{
    /// <summary>
    /// Calcula a data de validade baseada no tipo de documento.
    /// Receita simples: 6 meses. Controlada: 30 dias. Antimicrobiana: 10 dias.
    /// Atestado: data de emissão (não expira). Exame: 6 meses.
    /// </summary>
    public DateTime CalculateExpiresAt(DocumentType docType, string? prescriptionKind, DateTime issuedAt)
    {
        return (docType, prescriptionKind?.ToLowerInvariant()) switch
        {
            (DocumentType.Prescription, "controlled_special" or "controlado") => issuedAt.AddDays(30),
            (DocumentType.Prescription, "antimicrobial" or "antimicrobiano") => issuedAt.AddDays(10),
            (DocumentType.Prescription, _) => issuedAt.AddMonths(6),
            (DocumentType.ExamOrder, _) => issuedAt.AddMonths(6),
            (DocumentType.MedicalCertificate, _) => issuedAt.AddYears(5), // Atestado não "expira" mas tem retenção
            (DocumentType.MedicalReport, _) => issuedAt.AddYears(5),
            _ => issuedAt.AddMonths(6)
        };
    }

    /// <summary>
    /// Calcula max_dispenses baseado no tipo.
    /// Controlada/antimicrobiana: 1 uso. Simples: 1 uso (padrão brasileiro).
    /// </summary>
    public int CalculateMaxDispenses(DocumentType docType, string? prescriptionKind)
    {
        return (docType, prescriptionKind?.ToLowerInvariant()) switch
        {
            (DocumentType.Prescription, "controlled_special" or "controlado") => 1,
            (DocumentType.Prescription, "antimicrobial" or "antimicrobiano") => 1,
            (DocumentType.Prescription, _) => 1, // Receita simples: uso único (padrão ANVISA)
            (DocumentType.MedicalCertificate, _) => 1,
            _ => 1
        };
    }

    /// <summary>
    /// Gera código de acesso de 6 dígitos + hash para verificação.
    /// </summary>
    public (string code, string hash) GenerateVerifyCode()
    {
        // FIX B25: Use cryptographic RNG instead of Random.Shared for security-sensitive verification codes
        var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code))).ToLowerInvariant();
        return (code, hash);
    }

    /// <summary>
    /// Valida código de verificação contra o hash armazenado.
    /// </summary>
    public bool ValidateVerifyCode(string code, string storedHash)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(storedHash)) return false;
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code.Trim()))).ToLowerInvariant();
        var storedHashNormalized = storedHash.Trim().ToLowerInvariant();
        // FIX B26: Use constant-time comparison to prevent timing attacks
        // BUG FIX: FixedTimeEquals throws when byte spans differ in length — guard first (malformed/truncated storedHash).
        var hashBytes = Encoding.UTF8.GetBytes(hash);
        var storedBytes = Encoding.UTF8.GetBytes(storedHashNormalized);
        if (hashBytes.Length != storedBytes.Length) return false;
        return CryptographicOperations.FixedTimeEquals(hashBytes, storedBytes);
    }

    /// <summary>
    /// Registra dispensação do documento (farmacêutico verificou + dispensou).
    /// Retorna erro se já atingiu max_dispenses.
    /// </summary>
    public async Task<(bool success, string? error)> RecordDispensationAsync(
        Guid documentId, string dispensedBy, string? pharmacistName, string? pharmacistCrf, string? ip, CancellationToken ct)
    {
        // BUG FIX: the previous implementation read `dispensedCount` from medical_documents but the
        // controllers only ever write dispensation events to the access log (GetDispenseCountAsync),
        // so the guard here was comparing against a counter that is never incremented — allowing
        // unlimited dispensations. Use the access log as the source of truth (matching the
        // controller's IsAlreadyDispensed checks) to keep the cap consistent across call sites.
        // NOTE: This is still a TOCTOU check — for a hard guarantee the repository would need a
        // DB-level unique constraint / conditional insert. Callers that require strict single-use
        // should also rely on IPrescriptionVerifyRepository.MarkAsDispensedAsync which uses a
        // conditional UPDATE at the database level.
        var securityFields = await medicalDocumentRepository.GetSecurityFieldsAsync(documentId, ct);
        var maxDispenses = securityFields?.maxDispenses ?? 1;
        var currentCount = await accessLogRepository.GetDispenseCountAsync(documentId, ct);
        if (currentCount >= maxDispenses)
        {
            logger.LogWarning("Document {DocumentId} already dispensed {Count}/{Max} times",
                documentId, currentCount, maxDispenses);
            return (false, $"Documento j\u00e1 foi dispensado o n\u00famero m\u00e1ximo de vezes ({maxDispenses}).");
        }

        await accessLogRepository.LogAccessAsync(DocumentAccessEntry.Create(
            documentId: documentId,
            requestId: null,
            userId: null,
            action: "dispensed",
            actorType: "pharmacist",
            ipAddress: ip,
            metadata: System.Text.Json.JsonSerializer.Serialize(new
            {
                dispensed_by = dispensedBy,
                pharmacist_name = pharmacistName,
                pharmacist_crf = pharmacistCrf
            })
        ), ct);

        logger.LogInformation("Document {DocumentId} dispensed by {Pharmacy} (pharmacist: {Pharmacist}, CRF: {Crf})",
            documentId, dispensedBy, pharmacistName ?? "N/A", pharmacistCrf ?? "N/A");
        return (true, null);
    }

    /// <summary>
    /// Loga acesso a documento (download, visualização, verificação).
    /// </summary>
    public async Task LogAccessAsync(
        Guid? documentId, Guid? requestId, Guid? userId,
        string action, string actorType, string? ip, string? userAgent,
        CancellationToken ct)
    {
        await accessLogRepository.LogAccessAsync(DocumentAccessEntry.Create(
            documentId: documentId,
            requestId: requestId,
            userId: userId,
            action: action,
            actorType: actorType,
            ipAddress: ip,
            userAgent: userAgent
        ), ct);
    }
}
