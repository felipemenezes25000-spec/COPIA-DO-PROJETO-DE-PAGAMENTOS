namespace RenoveJa.Application.DTOs.CarePlans;

public record CreateAiSuggestionRequestDto(
    Guid PatientId,
    Guid? DoctorId,
    string PayloadJson,
    string Model,
    string CorrelationId
);

public record AiSuggestionResponseDto(
    Guid Id,
    Guid ConsultationId,
    Guid PatientId,
    Guid? DoctorId,
    string Status,
    string Model,
    string PayloadJson,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record AcceptedExamDto(
    string Name,
    string Priority,
    string? Instructions,
    string? Notes
);

public record InPersonRecommendationDto(
    bool Confirmed,
    string? Urgency,
    string? Message
);

public record CreateCarePlanFromSuggestionRequestDto(
    Guid AiSuggestionId,
    Guid ResponsibleDoctorId,
    List<AcceptedExamDto> AcceptedExams,
    InPersonRecommendationDto? InPersonRecommendation,
    bool CreateTasks,
    string CorrelationId
);

public record CarePlanTaskFileResponseDto(
    Guid Id,
    Guid TaskId,
    string FileUrl,
    string ContentType,
    DateTime CreatedAt
);

public record CarePlanTaskResponseDto(
    Guid Id,
    Guid CarePlanId,
    string Type,
    string State,
    string Title,
    string? Description,
    string PayloadJson,
    DateTime? DueAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<CarePlanTaskFileResponseDto> Files
);

public record CarePlanResponseDto(
    Guid Id,
    Guid ConsultationId,
    Guid PatientId,
    Guid ResponsibleDoctorId,
    string Status,
    Guid CreatedFromAiSuggestionId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ClosedAt,
    List<CarePlanTaskResponseDto> Tasks
);

public record CarePlanTaskActionRequestDto(
    string Action,
    string? Notes,
    string? ExistingFileUrl,
    string? ExistingStoragePath,
    string? ExistingFileContentType
);

public record CarePlanTaskDecisionDto(
    Guid TaskId,
    string Decision,
    string? Reason
);

public record ReviewCarePlanRequestDto(
    string? Notes,
    bool ClosePlan,
    List<CarePlanTaskDecisionDto> TaskDecisions
);
