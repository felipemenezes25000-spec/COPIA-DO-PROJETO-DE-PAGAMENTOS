namespace RenoveJa.Application.Configuration;

/// <summary>
/// Configuração da integração com a RNDS (Rede Nacional de Dados em Saúde).
/// Ref: https://rnds-guia.saude.gov.br — Padrão FHIR R4.
/// Autenticação: Two-way SSL com certificado ICP-Brasil.
/// </summary>
public class RndsConfig
{
    /// <summary>Endpoint de autenticação EHR-Auth (comum a todas as UFs).</summary>
    public string AuthUrl { get; set; } = "https://ehr-auth-hmg.saude.gov.br/api/token";

    /// <summary>Endpoint EHR-Services (varia por UF). Homologação SP.</summary>
    public string EhrUrl { get; set; } = "https://ehr-services-hmg.saude.gov.br/api";

    /// <summary>Identificador do solicitante fornecido pelo Portal de Serviços DATASUS.</summary>
    public string IdentificadorSolicitante { get; set; } = string.Empty;

    /// <summary>CNES do estabelecimento de saúde credenciado.</summary>
    public string Cnes { get; set; } = string.Empty;

    /// <summary>Caminho do certificado digital ICP-Brasil (.pfx) para autenticação two-way SSL.</summary>
    public string CertificadoPath { get; set; } = string.Empty;

    /// <summary>Senha do certificado digital.</summary>
    public string CertificadoSenha { get; set; } = string.Empty;

    /// <summary>Se true, usa ambiente de produção. Se false, usa homologação.</summary>
    public bool Producao { get; set; } = false;

    /// <summary>Timeout em segundos para requisições à RNDS.</summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>URL de autenticação de produção.</summary>
    public const string AuthUrlProducao = "https://ehr-auth.saude.gov.br/api/token";

    /// <summary>URL EHR-Services de produção para SP.</summary>
    public const string EhrUrlProducaoSP = "https://ehr-services.saude.gov.br/api";

    /// <summary>Retorna URL de auth correta conforme ambiente.</summary>
    public string GetAuthUrl() => Producao ? AuthUrlProducao : AuthUrl;

    /// <summary>Retorna URL EHR correta conforme ambiente.</summary>
    public string GetEhrUrl() => Producao ? EhrUrlProducaoSP : EhrUrl;
}
