using Microsoft.Extensions.Logging;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Application.Services.Routing;

/// <summary>
/// Estratégia de roteamento padrão (composta):
///
/// 1. Filtro estrito por especialidade (quando <see cref="RoutingContext.RequiredSpecialty"/>
///    for informada) — decisão deliberada: <b>não</b> faz fallback cross-specialty.
///    Motivo regulatório: CFM exige que a consulta seja conduzida por médico habilitado
///    na especialidade quando ela é crítica (psiquiatria, pediatria etc.).
/// 2. Desempate por balanceamento de carga:
///       a) <c>total_consultations</c> ASC — quem atendeu menos entra primeiro
///       b) <c>last_assigned_at</c> ASC NULLS FIRST — rotação justa, evita concentrar
///          pedidos em um só médico em janelas curtas.
///
/// Se nenhum médico satisfizer o filtro, retorna <c>null</c>. O chamador
/// (<c>RequestService.AssignToQueueAsync</c>) deve tratar esse caso deixando a
/// solicitação na fila aguardando (status <c>searching_doctor</c>), NUNCA
/// atribuindo a um médico de outra especialidade.
/// </summary>
public sealed class CompositeRoutingStrategy(
    IDoctorRepository doctorRepository,
    ILogger<CompositeRoutingStrategy> logger) : IRequestRoutingStrategy
{
    public async Task<RoutingDecision?> SelectDoctorAsync(
        RoutingContext context,
        CancellationToken cancellationToken = default)
    {
        var candidate = await doctorRepository.SelectLeastLoadedAvailableAsync(
            context.RequiredSpecialty,
            cancellationToken);

        if (candidate is null)
        {
            logger.LogWarning(
                "Nenhum médico disponível para requestId={RequestId} specialty={Specialty}. Solicitação permanecerá na fila.",
                context.RequestId,
                context.RequiredSpecialty ?? "(qualquer)");
            return null;
        }

        logger.LogInformation(
            "Roteamento selecionou doctorProfileId={DoctorProfileId} ({Name}, {Specialty}) para requestId={RequestId}",
            candidate.DoctorProfileId,
            candidate.Name,
            candidate.Specialty,
            context.RequestId);

        return new RoutingDecision(
            candidate.DoctorProfileId,
            candidate.UserId,
            candidate.Name,
            candidate.Specialty);
    }
}
