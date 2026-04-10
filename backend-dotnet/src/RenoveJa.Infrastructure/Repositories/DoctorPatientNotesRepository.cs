using Dapper;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Infrastructure.Data.Postgres;

namespace RenoveJa.Infrastructure.Repositories;

/// <summary>
/// Repositório de notas clínicas com filtro de sensibilidade (Phase C — CFM/CFP).
///
/// Leituras aplicam o filtro diretamente no SQL (defense in depth): mesmo que o
/// código de aplicação esqueça de filtrar, o repositório não devolve notas que
/// o visualizador não pode ver. É o contrário do modelo "trust the caller" —
/// aqui o dado sensível nunca sai do banco sem que a regra de visibilidade
/// tenha sido aplicada.
/// </summary>
public class DoctorPatientNotesRepository(PostgresClient db) : IDoctorPatientNotesRepository
{
    public async Task<IReadOnlyList<DoctorPatientNoteEntity>> GetVisibleNotesAsync(
        Guid viewerDoctorId,
        string? viewerSpecialty,
        Guid patientId,
        CancellationToken cancellationToken = default)
    {
        // Regra de visibilidade encapsulada no WHERE:
        //   - general        => sempre visível
        //   - specialty_only => só se author_specialty casar com viewer_specialty
        //   - author_only    => só para o próprio autor (outros veem summary_for_team
        //                       via transformação no SELECT)
        //
        // Para author_only visualizada por terceiros devolvemos um registro "mascarado":
        // content = summary_for_team (ou placeholder se vazio); isso garante que
        // nenhum conteúdo bruto de psicoterapia/saúde mental atravessa o limite
        // do repositório para quem não é o autor.
        const string sql = @"
SELECT n.id            AS Id,
       n.doctor_id     AS DoctorId,
       n.patient_id    AS PatientId,
       n.note_type     AS NoteType,
       CASE
         WHEN n.sensitivity = 'author_only' AND n.doctor_id <> @ViewerDoctorId
           THEN COALESCE(
                  NULLIF(n.summary_for_team, ''),
                  '[Nota protegida — conteúdo disponível apenas para o profissional autor (CFP 001/2009 / Lei 10.216/2001).]')
         ELSE COALESCE(n.content, '')
       END             AS Content,
       n.sensitivity   AS SensitivityRaw,
       n.author_specialty AS AuthorSpecialty,
       n.summary_for_team AS SummaryForTeam,
       n.request_id    AS RequestId,
       n.created_at    AS CreatedAt,
       n.updated_at    AS UpdatedAt
  FROM public.doctor_patient_notes n
 WHERE n.patient_id = @PatientId
   AND (
         n.sensitivity = 'general'
      OR (n.sensitivity = 'specialty_only'
          AND @ViewerSpecialty IS NOT NULL
          AND n.author_specialty IS NOT NULL
          AND LOWER(n.author_specialty) = LOWER(@ViewerSpecialty))
      OR (n.sensitivity = 'author_only' AND n.doctor_id = @ViewerDoctorId)
      OR (n.sensitivity = 'author_only'
          AND n.doctor_id <> @ViewerDoctorId
          AND NULLIF(n.summary_for_team, '') IS NOT NULL)
       )
 ORDER BY n.created_at DESC";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(cancellationToken);

        var rows = await conn.QueryAsync<NoteReadRow>(
            new CommandDefinition(
                sql,
                new
                {
                    ViewerDoctorId = viewerDoctorId,
                    ViewerSpecialty = viewerSpecialty,
                    PatientId = patientId
                },
                cancellationToken: cancellationToken));

        return rows.Select(r => new DoctorPatientNoteEntity(
            r.Id,
            r.DoctorId,
            r.PatientId,
            // note_type is nullable in the database; fall back explicitly here
            // instead of masking nulls inside NoteReadRow's default value.
            string.IsNullOrWhiteSpace(r.NoteType) ? "progress_note" : r.NoteType,
            r.Content,
            ParseSensitivity(r.SensitivityRaw),
            r.AuthorSpecialty,
            r.SummaryForTeam,
            r.RequestId,
            r.CreatedAt,
            r.UpdatedAt
        )).ToList();
    }

    public async Task<DoctorPatientNoteEntity> AddNoteAsync(
        Guid doctorId,
        string? authorSpecialty,
        Guid patientId,
        string noteType,
        string content,
        NoteSensitivity sensitivity,
        string? summaryForTeam,
        Guid? requestId,
        CancellationToken cancellationToken = default)
    {
        // Defense in depth (Phase C/F8): the controller already enforces this at
        // the API boundary, but the database currently has no CHECK constraint
        // forcing summary_for_team to be present when sensitivity = author_only.
        // Reject the insert here so a buggy caller cannot persist a hidden note
        // that would later be rendered as the generic "[Nota protegida...]"
        // placeholder with no team-readable summary attached.
        if (sensitivity == NoteSensitivity.AuthorOnly && string.IsNullOrWhiteSpace(summaryForTeam))
        {
            throw new InvalidOperationException(
                "Notes with sensitivity 'author_only' require a non-empty summary_for_team " +
                "so the rest of the care team has at least a redacted view of the note.");
        }

        var sensitivityStr = SerializeSensitivity(sensitivity);
        var now = DateTime.UtcNow;

        const string sql = @"
INSERT INTO public.doctor_patient_notes
    (doctor_id, patient_id, note_type, content, sensitivity, author_specialty, summary_for_team, request_id, created_at, updated_at)
VALUES
    (@DoctorId, @PatientId, @NoteType, @Content, @Sensitivity, @AuthorSpecialty, @SummaryForTeam, @RequestId, @CreatedAt, @UpdatedAt)
RETURNING id";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(cancellationToken);

        var id = await conn.ExecuteScalarAsync<Guid>(
            new CommandDefinition(
                sql,
                new
                {
                    DoctorId = doctorId,
                    PatientId = patientId,
                    NoteType = noteType,
                    Content = content.Trim(),
                    Sensitivity = sensitivityStr,
                    AuthorSpecialty = authorSpecialty,
                    SummaryForTeam = string.IsNullOrWhiteSpace(summaryForTeam) ? null : summaryForTeam.Trim(),
                    RequestId = requestId,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                cancellationToken: cancellationToken));

        return new DoctorPatientNoteEntity(
            id,
            doctorId,
            patientId,
            noteType,
            content.Trim(),
            sensitivity,
            authorSpecialty,
            string.IsNullOrWhiteSpace(summaryForTeam) ? null : summaryForTeam.Trim(),
            requestId,
            now,
            now);
    }

    public async Task LogAccessAsync(
        Guid noteId,
        Guid viewerDoctorId,
        string? viewerSpecialty,
        string? accessReason,
        CancellationToken cancellationToken = default)
    {
        const string sql = @"
INSERT INTO public.note_access_audit (note_id, viewer_doctor_id, viewer_specialty, access_reason, accessed_at)
VALUES (@NoteId, @ViewerDoctorId, @ViewerSpecialty, @AccessReason, @AccessedAt)";

        await using var conn = db.CreateConnectionPublic();
        await conn.OpenAsync(cancellationToken);

        await conn.ExecuteAsync(
            new CommandDefinition(
                sql,
                new
                {
                    NoteId = noteId,
                    ViewerDoctorId = viewerDoctorId,
                    ViewerSpecialty = viewerSpecialty,
                    AccessReason = accessReason,
                    AccessedAt = DateTime.UtcNow
                },
                cancellationToken: cancellationToken));
    }

    private static NoteSensitivity ParseSensitivity(string? raw) => raw?.ToLowerInvariant() switch
    {
        "specialty_only" => NoteSensitivity.SpecialtyOnly,
        "author_only" => NoteSensitivity.AuthorOnly,
        _ => NoteSensitivity.General
    };

    private static string SerializeSensitivity(NoteSensitivity s) => s switch
    {
        NoteSensitivity.SpecialtyOnly => "specialty_only",
        NoteSensitivity.AuthorOnly => "author_only",
        _ => "general"
    };

    private sealed class NoteReadRow
    {
        public Guid Id { get; set; }
        public Guid DoctorId { get; set; }
        public Guid PatientId { get; set; }
        public string? NoteType { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? SensitivityRaw { get; set; }
        public string? AuthorSpecialty { get; set; }
        public string? SummaryForTeam { get; set; }
        public Guid? RequestId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
