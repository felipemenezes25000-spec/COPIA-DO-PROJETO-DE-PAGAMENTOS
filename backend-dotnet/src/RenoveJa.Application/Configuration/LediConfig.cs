namespace RenoveJa.Application.Configuration;

/// <summary>
/// Configuração da integração LEDI / e-SUS APS.
/// </summary>
public class LediConfig
{
    /// <summary>URL base do PEC e-SUS APS da prefeitura. Ex: https://pec.jundiai.sp.gov.br</summary>
    public string PecBaseUrl { get; set; } = string.Empty;

    /// <summary>Token de autenticação para API do PEC.</summary>
    public string? PecAuthToken { get; set; }

    /// <summary>Usuário para autenticação básica no PEC.</summary>
    public string? PecUsername { get; set; }

    /// <summary>Senha para autenticação básica no PEC.</summary>
    public string? PecPassword { get; set; }

    /// <summary>Versão do LEDI APS implementada. Padrão: 7.3.7</summary>
    public string LediVersion { get; set; } = "7.3.7";

    /// <summary>Formato de serialização: xml ou thrift. Padrão: xml</summary>
    public string SerializationFormat { get; set; } = "xml";

    /// <summary>Máximo de tentativas de reenvio em caso de erro.</summary>
    public int MaxRetries { get; set; } = 3;

    /// <summary>Timeout em segundos para cada requisição ao PEC.</summary>
    public int TimeoutSeconds { get; set; } = 30;
}
