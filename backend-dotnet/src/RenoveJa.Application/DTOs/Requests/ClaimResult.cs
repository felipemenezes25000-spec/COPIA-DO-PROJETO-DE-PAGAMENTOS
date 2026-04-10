using RenoveJa.Domain.Entities;

namespace RenoveJa.Application.DTOs.Requests;

/// <summary>
/// Resultado de uma tentativa de claim de pedido por um médico.
/// </summary>
public class ClaimResult
{
    public bool Success { get; private init; }
    public string? ErrorMessage { get; private init; }
    public string? CurrentHolderName { get; private init; }
    public MedicalRequest? Request { get; private init; }
    public ClaimOutcome Outcome { get; private init; }

    public static ClaimResult Ok(MedicalRequest request) => new()
    {
        Success = true,
        Request = request,
        Outcome = ClaimOutcome.Success
    };

    public static ClaimResult Conflict(string holder) => new()
    {
        Success = false,
        CurrentHolderName = holder,
        ErrorMessage = $"Pedido ja atribuido a {holder}.",
        Outcome = ClaimOutcome.Conflict
    };

    public static ClaimResult NotFound() => new()
    {
        Success = false,
        ErrorMessage = "Pedido nao encontrado.",
        Outcome = ClaimOutcome.NotFound
    };

    public static ClaimResult Invalid(string message) => new()
    {
        Success = false,
        ErrorMessage = message,
        Outcome = ClaimOutcome.Invalid
    };
}

public enum ClaimOutcome
{
    Success,
    Conflict,
    NotFound,
    Invalid
}
