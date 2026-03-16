using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Infrastructure.Data.Models;
using RenoveJa.Infrastructure.Data.Postgres;

namespace RenoveJa.Infrastructure.Repositories;

public class CarePlanTaskRepository(PostgresClient db) : ICarePlanTaskRepository
{
    private const string TasksTable = "care_plan_tasks";
    private const string FilesTable = "care_plan_task_files";

        public async Task<Dictionary<Guid, List<CarePlanTaskFile>>> GetFilesByTaskIdsAsync(
        IEnumerable<Guid> taskIds, CancellationToken cancellationToken = default)
    {
        var idList = taskIds.ToList();
        if (idList.Count == 0) return new Dictionary<Guid, List<CarePlanTaskFile>>();
        var inClause = string.Join(",", idList.Select(id => $"'{id}'"));
        // PERF: uma unica query em vez de N queries (uma por task)
        var files = await db.GetAllAsync<CarePlanTaskFile>(
            "care_plan_task_files",
            filter: $"task_id=in.({inClause})",
            cancellationToken: cancellationToken);
        return files.GroupBy(f => f.TaskId)
                    .ToDictionary(g => g.Key, g => g.ToList());
    }

    public async Task<CarePlanTask?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var model = await db.GetSingleAsync<CarePlanTaskModel>(
            TasksTable,
            filter: $"id=eq.{id}",
            cancellationToken: cancellationToken);
        return model == null ? null : MapTaskToDomain(model);
    }

    public async Task<List<CarePlanTask>> GetByCarePlanIdAsync(Guid carePlanId, CancellationToken cancellationToken = default)
    {
        var models = await db.GetAllAsync<CarePlanTaskModel>(
            TasksTable,
            filter: $"care_plan_id=eq.{carePlanId}&order=created_at.asc",
            cancellationToken: cancellationToken);
        return models.Select(MapTaskToDomain).ToList();
    }

    public async Task<CarePlanTask> CreateAsync(CarePlanTask task, CancellationToken cancellationToken = default)
    {
        var created = await db.InsertAsync<CarePlanTaskModel>(
            TasksTable,
            MapTaskToModel(task),
            cancellationToken);
        return MapTaskToDomain(created);
    }

    public async Task<CarePlanTask> UpdateAsync(CarePlanTask task, CancellationToken cancellationToken = default)
    {
        var updated = await db.UpdateAsync<CarePlanTaskModel>(
            TasksTable,
            $"id=eq.{task.Id}",
            MapTaskToModel(task),
            cancellationToken);
        return MapTaskToDomain(updated);
    }

    public async Task<CarePlanTaskFile> CreateFileAsync(CarePlanTaskFile file, CancellationToken cancellationToken = default)
    {
        var created = await db.InsertAsync<CarePlanTaskFileModel>(
            FilesTable,
            MapFileToModel(file),
            cancellationToken);
        return MapFileToDomain(created);
    }

    public async Task<List<CarePlanTaskFile>> GetFilesByTaskIdAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var models = await db.GetAllAsync<CarePlanTaskFileModel>(
            FilesTable,
            filter: $"task_id=eq.{taskId}&order=created_at.asc",
            cancellationToken: cancellationToken);
        return models.Select(MapFileToDomain).ToList();
    }

    private static CarePlanTask MapTaskToDomain(CarePlanTaskModel m)
    {
        return CarePlanTask.Reconstitute(
            m.Id,
            m.CarePlanId,
            m.AssignedDoctorId,
            m.Type,
            m.State,
            m.Title,
            m.Description,
            m.PayloadJson,
            m.DueAt,
            m.CreatedAt,
            m.UpdatedAt);
    }

    private static CarePlanTaskModel MapTaskToModel(CarePlanTask t)
    {
        return new CarePlanTaskModel
        {
            Id = t.Id,
            CarePlanId = t.CarePlanId,
            AssignedDoctorId = t.AssignedDoctorId,
            Type = t.Type.ToString().ToSnakeCaseLower(),
            State = t.State.ToString().ToSnakeCaseLower(),
            Title = t.Title,
            Description = t.Description,
            PayloadJson = t.PayloadJson,
            DueAt = t.DueAt,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        };
    }

    private static CarePlanTaskFile MapFileToDomain(CarePlanTaskFileModel m)
    {
        return CarePlanTaskFile.Reconstitute(
            m.Id,
            m.TaskId,
            m.StoragePath,
            m.FileUrl,
            m.ContentType,
            m.UploadedByUserId,
            m.CreatedAt);
    }

    private static CarePlanTaskFileModel MapFileToModel(CarePlanTaskFile f)
    {
        return new CarePlanTaskFileModel
        {
            Id = f.Id,
            TaskId = f.TaskId,
            StoragePath = f.StoragePath,
            FileUrl = f.FileUrl,
            ContentType = f.ContentType,
            UploadedByUserId = f.UploadedByUserId,
            CreatedAt = f.CreatedAt
        };
    }
}

internal static class StringCaseExtensions
{
    public static string ToSnakeCaseLower(this string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return input;
        return string.Concat(input.Select((x, i) =>
            i > 0 && char.IsUpper(x) ? "_" + x : x.ToString())).ToLowerInvariant();
    }
}
