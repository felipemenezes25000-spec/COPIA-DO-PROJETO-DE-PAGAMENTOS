using RenoveJa.Domain.Entities.Sus;

namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Serviço de integração LEDI — geração de fichas e envio ao PEC e-SUS APS.
/// Referência: LEDI APS 7.3.7 — https://integracao.esusaps.bridge.ufsc.tech
/// </summary>
public interface ILediExportService
{
    /// <summary>
    /// Gera ficha LEDI de Cadastro Individual a partir de um cidadão.
    /// </summary>
    Task<LediFileResult> GerarFichaCadastroIndividualAsync(Cidadao cidadao, ProfissionalSus profissional, CancellationToken ct = default);

    /// <summary>
    /// Gera ficha LEDI de Atendimento Individual a partir de um atendimento APS.
    /// </summary>
    Task<LediFileResult> GerarFichaAtendimentoIndividualAsync(AtendimentoAps atendimento, Cidadao cidadao, ProfissionalSus profissional, UnidadeSaude unidade, CancellationToken ct = default);

    /// <summary>
    /// Envia um arquivo .esus para o PEC via POST /api/v1/recebimento/ficha.
    /// </summary>
    Task<LediSendResult> EnviarParaPecAsync(byte[] fileContent, string fileName, CancellationToken ct = default);

    /// <summary>
    /// Exporta todos os atendimentos não exportados e envia ao PEC.
    /// </summary>
    Task<LediExportBatchResult> ExportarLoteAsync(CancellationToken ct = default);

    /// <summary>
    /// Retorna status da exportação (pendentes, exportados, última data).
    /// </summary>
    Task<LediExportStatus> GetStatusAsync(CancellationToken ct = default);

    /// <summary>
    /// Valida os dados de um atendimento antes de gerar ficha LEDI.
    /// </summary>
    LediValidationResult ValidarAtendimento(AtendimentoAps atendimento, Cidadao cidadao, ProfissionalSus profissional, UnidadeSaude unidade);
}

// ── Result types ──

public record LediFileResult(bool Success, string? Uuid, byte[]? FileContent, string? FileName, string? ErrorMessage);

public record LediSendResult(bool Success, string? Uuid, int HttpStatus, string? ErrorMessage, string? ErrorCode);

public record LediExportBatchResult(int TotalProcessed, int Exported, int Errors, List<string> ErrorMessages);

public record LediExportStatus(int TotalPendentes, int TotalExportados, DateTime? UltimaExportacao);

public record LediValidationResult(bool IsValid, List<string> Errors)
{
    public static LediValidationResult Ok() => new(true, new());
    public static LediValidationResult Fail(params string[] errors) => new(false, errors.ToList());
}
