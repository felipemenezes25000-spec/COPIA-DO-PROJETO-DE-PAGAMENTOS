namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Serviço de normalização de medicamentos via RxNorm (NLM).
/// Valida nomes, retorna RXCUI e nome padronizado para interoperabilidade.
/// </summary>
public interface IRxNormService
{
    /// <summary>
    /// Busca medicamento por nome. Retorna RXCUI e nome normalizado se encontrado.
    /// </summary>
    Task<RxNormResult?> FindByDrugNameAsync(string drugName, CancellationToken cancellationToken = default);
}

/// <summary>Resultado da busca RxNorm.</summary>
/// <param name="Rxcui">Identificador RxNorm (RXCUI).</param>
/// <param name="NormalizedName">Nome normalizado do medicamento.</param>
/// <param name="Found">Se encontrou correspondência.</param>
public record RxNormResult(string? Rxcui, string? NormalizedName, bool Found);
