namespace RenoveJa.Domain.Enums;

/// <summary>
/// Classifica a confidencialidade de uma nota clínica escrita por um médico.
/// Implementa a distinção exigida por:
/// <list type="bullet">
///   <item><description>CFP Resolução 001/2009 — documentos escritos por psicólogos</description></item>
///   <item><description>Lei 10.216/2001 — direitos da pessoa com transtorno mental</description></item>
///   <item><description>CFM Resolução 1.638/2002 — prontuário único com níveis de acesso</description></item>
///   <item><description>LGPD Art. 11 — dados sensíveis de saúde</description></item>
/// </list>
///
/// A regra de visibilidade é aplicada por <c>NoteVisibilityPolicy</c> no momento da
/// leitura. A classificação é imutável após a criação (nota com adendo/correção
/// preserva a sensibilidade original — compliance de auditoria).
/// </summary>
public enum NoteSensitivity
{
    /// <summary>
    /// Nota clínica geral (padrão). Visível para qualquer médico com acesso ao
    /// prontuário do paciente. Exemplo: "PA 120x80, paciente estável."
    /// </summary>
    General = 0,

    /// <summary>
    /// Nota específica de especialidade. Visível apenas para médicos da mesma
    /// especialidade do autor. Use para conteúdo clínico que pode ser mal
    /// interpretado fora do contexto especializado (ex.: diferencial oncológico
    /// em notas de oncologia).
    /// </summary>
    SpecialtyOnly = 1,

    /// <summary>
    /// Nota privada do autor. Visível apenas para o próprio médico que a criou.
    /// Obrigatório para anotações de psicoterapia (CFP 001/2009) e conteúdo
    /// sensível de psiquiatria (Lei 10.216/2001). Outros profissionais enxergam
    /// apenas <c>SummaryForTeam</c>, se presente.
    /// </summary>
    AuthorOnly = 2,

    /// <summary>
    /// Resumo seguro compartilhado com a equipe. Não é armazenado como sensibilidade
    /// "principal" da nota — é o valor do campo <c>summary_for_team</c> quando a
    /// nota principal é <see cref="AuthorOnly"/>. Permite que o restante da equipe
    /// saiba o essencial (ex.: "em acompanhamento psiquiátrico, estável") sem ter
    /// acesso ao conteúdo clínico detalhado.
    /// </summary>
    PatientSummary = 3
}
