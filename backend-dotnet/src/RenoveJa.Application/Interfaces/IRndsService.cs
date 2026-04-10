namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Serviço de integração com a RNDS (Rede Nacional de Dados em Saúde).
/// Padrão FHIR R4 — https://rnds-fhir.saude.gov.br
/// 
/// Endpoints disponíveis:
/// - POST /token — autenticação two-way SSL
/// - GET /fhir/r4/Patient — consultar paciente por CNS/CPF
/// - GET /fhir/r4/Practitioner — consultar profissional
/// - GET /fhir/r4/Organization — consultar estabelecimento
/// - POST /fhir/r4/Bundle — enviar documento clínico
/// - GET /contexto-atendimento — gerar contexto
/// </summary>
public interface IRndsService
{
    /// <summary>
    /// Autentica com a RNDS via two-way SSL e obtém access_token (válido por 15min).
    /// </summary>
    Task<RndsAuthResult> AuthenticateAsync(CancellationToken ct = default);

    /// <summary>
    /// Consulta paciente na RNDS por CNS ou CPF.
    /// GET /fhir/r4/Patient?identifier={cns|cpf}
    /// </summary>
    Task<RndsPatientResult> GetPatientAsync(string cnsOrCpf, CancellationToken ct = default);

    /// <summary>
    /// Envia um Bundle FHIR R4 (documento clínico) para a RNDS.
    /// POST /fhir/r4/Bundle
    /// Retorna o ID RNDS no header Location em caso de sucesso (201).
    /// </summary>
    Task<RndsSendResult> SendBundleAsync(object fhirBundle, string cnsProfissional, CancellationToken ct = default);

    /// <summary>
    /// Consulta registros clínicos (timeline) de um paciente na RNDS.
    /// </summary>
    Task<RndsTimelineResult> GetTimelineAsync(string cnsPaciente, CancellationToken ct = default);

    /// <summary>
    /// Verifica se a RNDS está acessível (CapabilityStatement).
    /// GET /fhir/r4/metadata
    /// </summary>
    Task<bool> HealthCheckAsync(CancellationToken ct = default);
}

// ── Result types ──

public record RndsAuthResult(bool Success, string? AccessToken, DateTime? ExpiresAt, string? ErrorMessage);

public record RndsPatientResult(bool Success, string? PatientId, string? PatientJson, string? ErrorMessage);

public record RndsSendResult(bool Success, string? RndsId, string? LocationHeader, int HttpStatus, string? ErrorMessage);

public record RndsTimelineResult(bool Success, string? BundleJson, int TotalRecords, string? ErrorMessage);
