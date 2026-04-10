namespace RenoveJa.Application.Configuration;

/// <summary>
/// Opções de configuração para assinatura em lote.
/// </summary>
public class BatchSignatureOptions
{
    public const string SectionName = "BatchSignature";

    /// <summary>Número máximo de itens por lote de assinatura.</summary>
    public int MaxItemsPerBatch { get; set; } = 50;
}
