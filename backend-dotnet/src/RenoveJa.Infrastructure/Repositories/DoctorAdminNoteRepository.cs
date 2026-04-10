using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Infrastructure.Data.Models;
using RenoveJa.Infrastructure.Data.Postgres;

namespace RenoveJa.Infrastructure.Repositories;

public class DoctorAdminNoteRepository(PostgresClient db) : IDoctorAdminNoteRepository
{
    private const string TableName = "doctor_admin_notes";

    public async Task<List<DoctorAdminNote>> GetByDoctorProfileAsync(
        Guid doctorProfileId,
        CancellationToken cancellationToken = default)
    {
        var models = await db.GetAllAsync<DoctorAdminNoteModel>(
            TableName,
            filter: $"doctor_profile_id=eq.{doctorProfileId}",
            orderBy: "created_at.desc",
            cancellationToken: cancellationToken);

        return models.Select(MapToDomain).ToList();
    }

    public async Task<DoctorAdminNote> CreateAsync(
        DoctorAdminNote note,
        CancellationToken cancellationToken = default)
    {
        var created = await db.InsertAsync<DoctorAdminNoteModel>(
            TableName,
            MapToModel(note),
            cancellationToken);
        return MapToDomain(created);
    }

    private static DoctorAdminNote MapToDomain(DoctorAdminNoteModel m)
    {
        return DoctorAdminNote.Reconstitute(
            m.Id,
            m.DoctorProfileId,
            m.AuthorUserId,
            m.AuthorName,
            m.Text,
            m.CreatedAt);
    }

    private static DoctorAdminNoteModel MapToModel(DoctorAdminNote n)
    {
        return new DoctorAdminNoteModel
        {
            Id = n.Id,
            DoctorProfileId = n.DoctorProfileId,
            AuthorUserId = n.AuthorUserId,
            AuthorName = n.AuthorName,
            Text = n.Text,
            CreatedAt = n.CreatedAt
        };
    }
}
