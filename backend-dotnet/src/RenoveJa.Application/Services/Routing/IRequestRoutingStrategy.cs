namespace RenoveJa.Application.Services.Routing;

/// <summary>
/// Contexto para decisão de roteamento de uma solicitação a um médico.
/// </summary>
public sealed record RoutingContext(
    Guid RequestId,
    Guid PatientId,
    string RequestType,
    string? RequiredSpecialty);

/// <summary>
/// Decisão de roteamento: qual médico deve atender a solicitação.
/// </summary>
public sealed record RoutingDecision(
    Guid DoctorProfileId,
    Guid DoctorUserId,
    string DoctorName,
    string Specialty);

/// <summary>
/// Estratégia de seleção do médico que deve receber uma solicitação entrando na fila.
/// Permite compor regras (especialidade, balanceamento de carga, continuidade de cuidado, etc.)
/// sem acoplar a lógica ao <c>RequestService</c>.
/// </summary>
/// <remarks>
/// Retorna <c>null</c> quando nenhum médico elegível foi encontrado. O <em>caller</em>
/// decide se deixa a solicitação na fila ou notifica um administrador.
/// </remarks>
public interface IRequestRoutingStrategy
{
    Task<RoutingDecision?> SelectDoctorAsync(
        RoutingContext context,
        CancellationToken cancellationToken = default);
}
