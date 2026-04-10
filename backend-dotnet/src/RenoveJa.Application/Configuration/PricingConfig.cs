namespace RenoveJa.Application.Configuration;

/// <summary>
/// Configuracao de precos por tipo de solicitacao.
/// Valores carregados da secao "Pricing" do appsettings.json.
/// </summary>
public class PricingConfig
{
    public const string SectionName = "Pricing";

    /// <summary>Preco receita simples (R$).</summary>
    public decimal PrescriptionSimple { get; set; } = 29.90m;

    /// <summary>Preco receita controlada (R$).</summary>
    public decimal PrescriptionControlled { get; set; } = 49.90m;

    /// <summary>Preco exame laboratorial (R$).</summary>
    public decimal ExamLaboratorial { get; set; } = 19.90m;

    /// <summary>Preco exame de imagem (R$).</summary>
    public decimal ExamImagem { get; set; } = 29.90m;

    /// <summary>Preco por minuto para consulta com psicologo (R$).</summary>
    public decimal ConsultationPsicologoPerMinute { get; set; } = 3.99m;

    /// <summary>Preco por minuto para consulta com clinico geral (R$).</summary>
    public decimal ConsultationClinicoPerMinute { get; set; } = 6.99m;

    /// <summary>Minutos minimos contratados para consulta.</summary>
    public int ConsultationMinimumMinutes { get; set; } = 5;
}
