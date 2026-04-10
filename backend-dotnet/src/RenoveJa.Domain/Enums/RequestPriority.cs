namespace RenoveJa.Domain.Enums;

/// <summary>
/// Prioridade clínica de uma solicitação médica. Usada para ordenar a fila:
/// solicitações com prioridade maior são atendidas primeiro quando há concorrência
/// por médicos disponíveis.
///
/// A classificação é feita na triagem (manual ou IA) no momento da criação da
/// solicitação. Pode ser reclassificada antes da atribuição do médico — depois
/// disso, fica imutável para preservar trilha de auditoria.
/// </summary>
public enum RequestPriority
{
    /// <summary>
    /// Baixa prioridade: caso rotineiro, renovação de receita sem urgência,
    /// exame de rotina. Entra no final da fila.
    /// </summary>
    Low = 0,

    /// <summary>
    /// Prioridade padrão (default). Aplica-se à maioria das solicitações.
    /// </summary>
    Normal = 1,

    /// <summary>
    /// Alta prioridade: sintomas agudos, medicação controlada com prazo,
    /// exames com suspeita clínica relevante. Sobe na fila.
    /// </summary>
    High = 2,

    /// <summary>
    /// Urgência clínica: dor severa, risco iminente, agravamento rápido. Vai
    /// para o topo absoluto da fila. Uso restrito — triagem deve justificar.
    /// </summary>
    Urgent = 3
}
