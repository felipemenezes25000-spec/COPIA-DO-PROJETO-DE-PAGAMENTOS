using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Infrastructure.Data.Models;
using RenoveJa.Infrastructure.Data.Postgres;

namespace RenoveJa.Infrastructure.Repositories;

/// <summary>
/// Repositório de salas de vídeo via db.
/// </summary>
public class VideoRoomRepository(PostgresClient db) : IVideoRoomRepository
{
    private const string TableName = "video_rooms";

    /// <summary>
    /// Obtém uma sala de vídeo pelo ID.
    /// </summary>
    public async Task<VideoRoom?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var model = await db.GetSingleAsync<VideoRoomModel>(
            TableName,
            filter: $"id=eq.{id}",
            cancellationToken: cancellationToken);

        return model != null ? MapToDomain(model) : null;
    }

    public async Task<VideoRoom?> GetByRequestIdAsync(Guid requestId, CancellationToken cancellationToken = default)
    {
        var model = await db.GetSingleAsync<VideoRoomModel>(
            TableName,
            filter: $"request_id=eq.{requestId}",
            cancellationToken: cancellationToken);

        return model != null ? MapToDomain(model) : null;
    }

    public async Task<VideoRoom> CreateAsync(VideoRoom videoRoom, CancellationToken cancellationToken = default)
    {
        var model = MapToModel(videoRoom);
        var created = await db.InsertAsync<VideoRoomModel>(
            TableName,
            model,
            cancellationToken);

        return MapToDomain(created);
    }

    public async Task<VideoRoom> UpdateAsync(VideoRoom videoRoom, CancellationToken cancellationToken = default)
    {
        var model = MapToModel(videoRoom);
        var updated = await db.UpdateAsync<VideoRoomModel>(
            TableName,
            $"id=eq.{videoRoom.Id}",
            model,
            cancellationToken);

        return MapToDomain(updated);
    }

    private static VideoRoom MapToDomain(VideoRoomModel model)
    {
        return VideoRoom.Reconstitute(
            model.Id,
            model.RequestId,
            model.RoomName,
            model.RoomUrl,
            model.Status,
            model.StartedAt,
            model.EndedAt,
            model.DurationSeconds,
            model.CreatedAt);
    }

    private static VideoRoomModel MapToModel(VideoRoom room)
    {
        return new VideoRoomModel
        {
            Id = room.Id,
            RequestId = room.RequestId,
            RoomName = room.RoomName,
            RoomUrl = room.RoomUrl,
            Status = room.Status.ToString().ToLowerInvariant(),
            StartedAt = room.StartedAt,
            EndedAt = room.EndedAt,
            DurationSeconds = room.DurationSeconds,
            CreatedAt = room.CreatedAt
        };
    }
}
