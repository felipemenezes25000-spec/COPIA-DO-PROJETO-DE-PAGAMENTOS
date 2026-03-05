namespace RenoveJa.Domain.Interfaces;

/// <summary>
/// Repositório de notas clínicas do médico sobre o paciente.
/// Modelo inspirado em FHIR (ClinicalImpression), Epic/Cerner (progress notes, addendums).
/// </summary>
public interface IDoctorPatientNotesRepository
{
    Task<IReadOnlyList<DoctorPatientNoteEntity>> GetNotesAsync(Guid doctorId, Guid patientId, CancellationToken cancellationToken = default);
    Task<DoctorPatientNoteEntity> AddNoteAsync(Guid doctorId, Guid patientId, string noteType, string content, Guid? requestId, CancellationToken cancellationToken = default);
}

/// <summary>Entidade de nota clínica para o repositório.</summary>
public record DoctorPatientNoteEntity(
    Guid Id,
    Guid DoctorId,
    Guid PatientId,
    string NoteType,
    string Content,
    Guid? RequestId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
