using RenoveJa.Application.DTOs.Clinical;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Gera notas SOAP pós-consulta usando IA.
/// </summary>
public interface ISoapNotesService
{
    /// <summary>Gera notas SOAP a partir de transcrição e anamnese.</summary>
    Task<SoapNotesResult?> GenerateAsync(
        string transcriptText,
        string? anamnesisJson,
        CancellationToken cancellationToken = default);
}
