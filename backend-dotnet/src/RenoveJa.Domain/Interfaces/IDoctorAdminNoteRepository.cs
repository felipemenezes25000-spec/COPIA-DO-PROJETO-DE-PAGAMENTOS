using RenoveJa.Domain.Entities;

namespace RenoveJa.Domain.Interfaces;

public interface IDoctorAdminNoteRepository
{
    /// <summary>Lista notas internas do RH para um candidato, ordenadas da mais recente para a mais antiga.</summary>
    Task<List<DoctorAdminNote>> GetByDoctorProfileAsync(Guid doctorProfileId, CancellationToken cancellationToken = default);

    /// <summary>Cria uma nova nota interna. Histórico é preservado.</summary>
    Task<DoctorAdminNote> CreateAsync(DoctorAdminNote note, CancellationToken cancellationToken = default);
}
