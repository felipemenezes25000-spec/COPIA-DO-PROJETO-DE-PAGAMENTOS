namespace RenoveJa.Domain.Enums;

/// <summary>
/// Status do agendamento na UBS.
/// Fluxo: Agendado → Aguardando (check-in) → Chamado → EmAtendimento → Finalizado
/// </summary>
public enum AgendaStatus
{
    Agendado,
    Aguardando,
    Chamado,
    EmAtendimento,
    Finalizado,
    Cancelado,
    NaoCompareceu,
}
