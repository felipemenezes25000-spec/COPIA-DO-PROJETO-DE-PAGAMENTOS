using System.Text.Json.Serialization;

namespace RenoveJa.Infrastructure.Data.Models;

public class AiSuggestionModel
{
    public Guid Id { get; set; }
    [JsonPropertyName("consultation_id")]
    public Guid ConsultationId { get; set; }
    [JsonPropertyName("patient_id")]
    public Guid PatientId { get; set; }
    [JsonPropertyName("doctor_id")]
    public Guid? DoctorId { get; set; }
    public string Type { get; set; } = "exam_suggestion";
    public string Status { get; set; } = "generated";
    public string Model { get; set; } = string.Empty;
    [JsonPropertyName("payload_json")]
    public string PayloadJson { get; set; } = "{}";
    [JsonPropertyName("payload_hash")]
    public string PayloadHash { get; set; } = string.Empty;
    [JsonPropertyName("correlation_id")]
    public string? CorrelationId { get; set; }
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

public class CarePlanModel
{
    public Guid Id { get; set; }
    [JsonPropertyName("consultation_id")]
    public Guid ConsultationId { get; set; }
    [JsonPropertyName("patient_id")]
    public Guid PatientId { get; set; }
    [JsonPropertyName("responsible_doctor_id")]
    public Guid ResponsibleDoctorId { get; set; }
    public string Status { get; set; } = "active";
    [JsonPropertyName("created_from_ai_suggestion_id")]
    public Guid CreatedFromAiSuggestionId { get; set; }
    [JsonPropertyName("correlation_id")]
    public string? CorrelationId { get; set; }
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
    [JsonPropertyName("closed_at")]
    public DateTime? ClosedAt { get; set; }
}

public class CarePlanTaskModel
{
    public Guid Id { get; set; }
    [JsonPropertyName("care_plan_id")]
    public Guid CarePlanId { get; set; }
    [JsonPropertyName("assigned_doctor_id")]
    public Guid AssignedDoctorId { get; set; }
    public string Type { get; set; } = "instruction";
    public string State { get; set; } = "pending";
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    [JsonPropertyName("payload_json")]
    public string PayloadJson { get; set; } = "{}";
    [JsonPropertyName("due_at")]
    public DateTime? DueAt { get; set; }
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

public class CarePlanTaskFileModel
{
    public Guid Id { get; set; }
    [JsonPropertyName("task_id")]
    public Guid TaskId { get; set; }
    [JsonPropertyName("storage_path")]
    public string StoragePath { get; set; } = string.Empty;
    [JsonPropertyName("file_url")]
    public string FileUrl { get; set; } = string.Empty;
    [JsonPropertyName("content_type")]
    public string ContentType { get; set; } = string.Empty;
    [JsonPropertyName("uploaded_by_user_id")]
    public Guid UploadedByUserId { get; set; }
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

public class OutboxEventModel
{
    public Guid Id { get; set; }
    [JsonPropertyName("aggregate_type")]
    public string AggregateType { get; set; } = string.Empty;
    [JsonPropertyName("aggregate_id")]
    public Guid AggregateId { get; set; }
    [JsonPropertyName("event_type")]
    public string EventType { get; set; } = string.Empty;
    [JsonPropertyName("payload_json")]
    public string PayloadJson { get; set; } = "{}";
    [JsonPropertyName("idempotency_key")]
    public string IdempotencyKey { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    [JsonPropertyName("processed_at")]
    public DateTime? ProcessedAt { get; set; }
}
