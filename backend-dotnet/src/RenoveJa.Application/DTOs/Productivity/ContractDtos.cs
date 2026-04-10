namespace RenoveJa.Application.DTOs.Productivity;

/// <summary>
/// Contrato opcional de horas por médico — usado para calcular utilização e
/// custo de ociosidade (horas contratadas − horas ativas) × valor/hora.
/// Quando ausente, o dashboard mostra `UtilizationRate = null` e `IdleCostCents = 0`.
/// </summary>
public record DoctorContractDto(
    Guid Id,
    Guid DoctorProfileId,
    string? DoctorName,
    int HoursPerMonth,
    long HourlyRateCents,
    string Currency,
    string? AvailabilityWindowJson,
    DateTime StartsAt,
    DateTime? EndsAt,
    bool Active,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record UpsertDoctorContractDto(
    int HoursPerMonth,
    long HourlyRateCents,
    string? Currency,
    string? AvailabilityWindowJson,
    DateTime StartsAt,
    DateTime? EndsAt,
    string? Notes);
