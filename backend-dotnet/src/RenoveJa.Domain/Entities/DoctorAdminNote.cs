using RenoveJa.Domain.Exceptions;

namespace RenoveJa.Domain.Entities;

/// <summary>
/// Nota interna do RH sobre um candidato (doctor_profile).
/// Diferente de doctor_patient_notes (que são notas clínicas sobre pacientes).
/// Histórico preservado: cada nota é uma linha; nunca editamos/apagamos.
/// </summary>
public class DoctorAdminNote : AggregateRoot
{
    public Guid DoctorProfileId { get; private set; }
    public Guid AuthorUserId { get; private set; }
    public string AuthorName { get; private set; } = string.Empty;
    public string Text { get; private set; } = string.Empty;

    private DoctorAdminNote() : base() { }

    private DoctorAdminNote(
        Guid id,
        Guid doctorProfileId,
        Guid authorUserId,
        string authorName,
        string text,
        DateTime createdAt) : base(id, createdAt)
    {
        DoctorProfileId = doctorProfileId;
        AuthorUserId = authorUserId;
        AuthorName = authorName;
        Text = text;
    }

    public static DoctorAdminNote Create(
        Guid doctorProfileId,
        Guid authorUserId,
        string authorName,
        string text)
    {
        if (doctorProfileId == Guid.Empty)
            throw new DomainException("DoctorProfileId is required");
        if (authorUserId == Guid.Empty)
            throw new DomainException("AuthorUserId is required");
        if (string.IsNullOrWhiteSpace(text))
            throw new DomainException("Text is required");
        if (text.Length > 4000)
            throw new DomainException("Text must be at most 4000 characters");

        var now = DateTime.UtcNow;
        return new DoctorAdminNote(
            Guid.NewGuid(),
            doctorProfileId,
            authorUserId,
            string.IsNullOrWhiteSpace(authorName) ? "Admin" : authorName.Trim(),
            text.Trim(),
            now);
    }

    public static DoctorAdminNote Reconstitute(
        Guid id,
        Guid doctorProfileId,
        Guid authorUserId,
        string authorName,
        string text,
        DateTime createdAt)
    {
        return new DoctorAdminNote(
            id,
            doctorProfileId,
            authorUserId,
            authorName ?? string.Empty,
            text ?? string.Empty,
            createdAt);
    }
}
