using RenoveJa.Domain.Enums;

namespace RenoveJa.Domain.Interfaces;

/// <summary>
/// Repositório de notas clínicas do médico sobre o paciente.
/// Modelo inspirado em FHIR (ClinicalImpression), Epic/Cerner (progress notes, addendums).
///
/// Phase C (compliance CFM/CFP): cada nota tem um nível de <see cref="NoteSensitivity"/>
/// que governa a visibilidade. Leituras passam pelo repositório já filtradas —
/// esta é a defesa principal contra vazamento de dados sensíveis (ex.: notas de
/// psicoterapia visíveis para clínico geral).
/// </summary>
public interface IDoctorPatientNotesRepository
{
    /// <summary>
    /// Lista as notas que um visualizador (médico) pode ver legalmente sobre o paciente.
    /// Aplica o filtro de sensibilidade diretamente no SQL:
    /// <list type="bullet">
    ///   <item><description><see cref="NoteSensitivity.General"/> — visível para qualquer médico</description></item>
    ///   <item><description><see cref="NoteSensitivity.SpecialtyOnly"/> — visível se <paramref name="viewerSpecialty"/> == author_specialty</description></item>
    ///   <item><description><see cref="NoteSensitivity.AuthorOnly"/> — visível apenas se viewerDoctorId == doctor_id (autor); outros veem o summary_for_team se presente</description></item>
    /// </list>
    /// </summary>
    Task<IReadOnlyList<DoctorPatientNoteEntity>> GetVisibleNotesAsync(
        Guid viewerDoctorId,
        string? viewerSpecialty,
        Guid patientId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cria uma nova nota clínica. A sensibilidade é imutável após criação.
    /// Se <paramref name="sensitivity"/> for <see cref="NoteSensitivity.AuthorOnly"/>,
    /// recomenda-se fornecer um <paramref name="summaryForTeam"/> para não bloquear
    /// totalmente a visibilidade da equipe multidisciplinar.
    /// </summary>
    Task<DoctorPatientNoteEntity> AddNoteAsync(
        Guid doctorId,
        string? authorSpecialty,
        Guid patientId,
        string noteType,
        string content,
        NoteSensitivity sensitivity,
        string? summaryForTeam,
        Guid? requestId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Registra auditoria de leitura de uma nota sensível (CFP/LGPD).
    /// </summary>
    Task LogAccessAsync(
        Guid noteId,
        Guid viewerDoctorId,
        string? viewerSpecialty,
        string? accessReason,
        CancellationToken cancellationToken = default);
}

/// <summary>Entidade de nota clínica para o repositório.</summary>
public record DoctorPatientNoteEntity(
    Guid Id,
    Guid DoctorId,
    Guid PatientId,
    string NoteType,
    string Content,
    NoteSensitivity Sensitivity,
    string? AuthorSpecialty,
    string? SummaryForTeam,
    Guid? RequestId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
