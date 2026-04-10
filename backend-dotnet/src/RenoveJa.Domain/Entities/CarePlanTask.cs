using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Exceptions;

namespace RenoveJa.Domain.Entities;

public class CarePlanTask : Entity
{
    public Guid CarePlanId { get; private set; }
    public Guid AssignedDoctorId { get; private set; }
    public CarePlanTaskType Type { get; private set; }
    public CarePlanTaskState State { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string PayloadJson { get; private set; } = "{}";
    public DateTime? DueAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private CarePlanTask() : base() { }

    private CarePlanTask(
        Guid id,
        Guid carePlanId,
        Guid assignedDoctorId,
        CarePlanTaskType type,
        CarePlanTaskState state,
        string title,
        string? description,
        string payloadJson,
        DateTime? dueAt,
        DateTime createdAt,
        DateTime updatedAt) : base(id, createdAt)
    {
        CarePlanId = carePlanId;
        AssignedDoctorId = assignedDoctorId;
        Type = type;
        State = state;
        Title = title;
        Description = description;
        PayloadJson = payloadJson;
        DueAt = dueAt;
        UpdatedAt = updatedAt;
    }

    public static CarePlanTask Create(
        Guid carePlanId,
        Guid assignedDoctorId,
        CarePlanTaskType type,
        string title,
        string? description,
        string payloadJson,
        DateTime? dueAt = null)
    {
        if (carePlanId == Guid.Empty) throw new DomainException("CarePlanId is required");
        if (assignedDoctorId == Guid.Empty) throw new DomainException("AssignedDoctorId is required");
        if (string.IsNullOrWhiteSpace(title)) throw new DomainException("Task title is required");

        return new CarePlanTask(
            Guid.NewGuid(),
            carePlanId,
            assignedDoctorId,
            type,
            CarePlanTaskState.Pending,
            title.Trim(),
            description,
            string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson,
            dueAt,
            DateTime.UtcNow,
            DateTime.UtcNow);
    }

    public static CarePlanTask Reconstitute(
        Guid id,
        Guid carePlanId,
        Guid assignedDoctorId,
        string type,
        string state,
        string title,
        string? description,
        string payloadJson,
        DateTime? dueAt,
        DateTime createdAt,
        DateTime updatedAt)
    {
        var parsedType = Enum.TryParse<CarePlanTaskType>(type, true, out var t) ? t : CarePlanTaskType.Instruction;
        var parsedState = Enum.TryParse<CarePlanTaskState>(state, true, out var s) ? s : CarePlanTaskState.Pending;

        return new CarePlanTask(
            id,
            carePlanId,
            assignedDoctorId,
            parsedType,
            parsedState,
            title,
            description,
            payloadJson,
            dueAt,
            createdAt,
            updatedAt);
    }

    public void Start()
    {
        if (State != CarePlanTaskState.Pending) return;
        State = CarePlanTaskState.InProgress;
        UpdatedAt = DateTime.UtcNow;
    }

    public void CompleteByPatient()
    {
        if (State is not (CarePlanTaskState.InProgress or CarePlanTaskState.Pending))
            throw new DomainException("Task must be pending/in progress");
        State = CarePlanTaskState.DoneByPatient;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Submit()
    {
        if (State is not (CarePlanTaskState.InProgress or CarePlanTaskState.DoneByPatient or CarePlanTaskState.Pending))
            throw new DomainException("Task cannot be submitted in current state");
        State = CarePlanTaskState.Submitted;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkReviewed()
    {
        if (State is CarePlanTaskState.Closed) return;
        State = CarePlanTaskState.Reviewed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkRejected()
    {
        State = CarePlanTaskState.Rejected;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Close()
    {
        State = CarePlanTaskState.Closed;
        UpdatedAt = DateTime.UtcNow;
    }
}
