using RenoveJa.Domain.Exceptions;

namespace RenoveJa.Domain.Entities;

public class CarePlanTaskFile : Entity
{
    public Guid TaskId { get; private set; }
    public string StoragePath { get; private set; } = string.Empty;
    public string FileUrl { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public Guid UploadedByUserId { get; private set; }

    private CarePlanTaskFile() : base() { }

    private CarePlanTaskFile(
        Guid id,
        Guid taskId,
        string storagePath,
        string fileUrl,
        string contentType,
        Guid uploadedByUserId,
        DateTime createdAt) : base(id, createdAt)
    {
        TaskId = taskId;
        StoragePath = storagePath;
        FileUrl = fileUrl;
        ContentType = contentType;
        UploadedByUserId = uploadedByUserId;
    }

    public static CarePlanTaskFile Create(
        Guid taskId,
        string storagePath,
        string fileUrl,
        string contentType,
        Guid uploadedByUserId)
    {
        if (taskId == Guid.Empty) throw new DomainException("TaskId is required");
        if (string.IsNullOrWhiteSpace(storagePath)) throw new DomainException("StoragePath is required");
        if (string.IsNullOrWhiteSpace(fileUrl)) throw new DomainException("FileUrl is required");
        if (uploadedByUserId == Guid.Empty) throw new DomainException("UploadedByUserId is required");

        return new CarePlanTaskFile(
            Guid.NewGuid(),
            taskId,
            storagePath,
            fileUrl,
            string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            uploadedByUserId,
            DateTime.UtcNow);
    }

    public static CarePlanTaskFile Reconstitute(
        Guid id,
        Guid taskId,
        string storagePath,
        string fileUrl,
        string contentType,
        Guid uploadedByUserId,
        DateTime createdAt)
    {
        return new CarePlanTaskFile(id, taskId, storagePath, fileUrl, contentType, uploadedByUserId, createdAt);
    }
}
