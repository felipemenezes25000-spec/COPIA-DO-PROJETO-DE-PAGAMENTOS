namespace RenoveJa.Application.DTOs.Productivity;

/// <summary>
/// DTOs do módulo de Monitor de Produtividade Médica (portal RH).
/// Spec: docs/superpowers/specs/2026-04-09-monitor-produtividade-medica-design.md
///
/// Todos os valores monetários são expressos em *centavos* (BIGINT) para evitar
/// perda de precisão com <see cref="decimal"/> em JSON e para bater com a coluna
/// <c>price_cents</c>/<c>hourly_rate_cents</c> das tabelas <c>product_prices</c> e
/// <c>doctor_contracts</c>. O frontend RH converte para R$ no ponto de exibição.
/// </summary>
public record OverviewDto(
    DateTime FromUtc,
    DateTime ToUtc,
    int TotalRequests,
    int CompletedRequests,
    decimal CompletionRate,
    int RejectedByDoctor,
    int RejectedByAi,
    int ReopenedFromAi,
    double P50MinutesToSign,
    double P95MinutesToSign,
    long RevenueCents,
    long IdleCostCents,
    int ActiveDoctors,
    int DoctorsOnline);

public record DoctorProductivityRow(
    Guid DoctorProfileId,
    Guid UserId,
    string Name,
    string Specialty,
    int RequestsHandled,
    int Reviewed,
    int Signed,
    int BatchSigned,
    double P50MinutesToSign,
    double P95MinutesToSign,
    long RevenueCents,
    long IdleCostCents,
    decimal? UtilizationRate,
    decimal BatchSignRate,
    DateTime? LastActivityAt);

public record DoctorDetailDto(
    DoctorProductivityRow Summary,
    FunnelDto Funnel,
    HeatmapCell[] Heatmap,
    TimelineItem[] RecentTimeline,
    RevenueBreakdown[] RevenueByProduct);

public record HeatmapCell(int DayOfWeek, int Hour, int Count);

public record TimelineItem(
    Guid RequestId,
    string ShortCode,
    string RequestType,
    string Status,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    DateTime? ApprovedForSigningAt,
    DateTime? SignedAt,
    DateTime? DeliveredAt,
    double? MinutesCreatedToSigned,
    long ProductRevenueCents);

public record RevenueBreakdown(
    string ProductKey,
    string Label,
    int Quantity,
    long UnitPriceCents,
    long TotalCents);

public record FunnelDto(
    int Created,
    int Assigned,
    int Reviewed,
    int Approved,
    int Signed,
    int Delivered,
    int Rejected,
    int Cancelled);

public record SlaDto(
    SlaByPriority Urgent,
    SlaByPriority High,
    SlaByPriority Normal);

public record SlaByPriority(
    int TargetMinutes,
    double P50Minutes,
    double P95Minutes,
    decimal WithinTargetRate,
    int Breached);

public record LiveQueueDto(
    DateTime ServerTimeUtc,
    int TotalPending,
    int UnassignedCount,
    int UrgentCount,
    int BreachingSlaCount,
    QueueItem[] Urgent,
    QueueItem[] OldestUnassigned,
    DoctorActivitySignal[] Online);

public record QueueItem(
    Guid Id,
    string ShortCode,
    string RequestType,
    string Priority,
    string Status,
    string? RequiredSpecialty,
    DateTime CreatedAt,
    int MinutesWaiting,
    bool SlaBreached,
    Guid? DoctorId,
    string? DoctorName);

public record DoctorActivitySignal(
    Guid DoctorProfileId,
    string Name,
    string Specialty,
    DateTime LastActivityAt,
    string LastAction,
    int ActionsLast5Min);
