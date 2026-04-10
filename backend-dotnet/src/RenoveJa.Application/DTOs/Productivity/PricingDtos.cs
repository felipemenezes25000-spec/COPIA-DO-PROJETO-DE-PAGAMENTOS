namespace RenoveJa.Application.DTOs.Productivity;

/// <summary>
/// DTOs da tabela de preços por tipo de atendimento.
/// Cada linha representa o valor (em centavos) que o contratante paga para que
/// um médico emita um documento daquele tipo ou preste um minuto de consulta.
/// </summary>
public record ProductPriceDto(
    Guid Id,
    string ProductKey,
    string Label,
    string Unit,
    long PriceCents,
    string Currency,
    bool Active,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record UpsertProductPriceDto(
    string Label,
    string Unit,
    long PriceCents,
    string? Currency,
    string? Notes);

public record CreateCustomProductDto(
    string ProductKey,
    string Label,
    string Unit,
    long PriceCents,
    string? Currency,
    string? Notes);
