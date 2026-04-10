namespace RenoveJa.Application.Helpers;

/// <summary>
/// Validador de CNS (Cartão Nacional de Saúde) conforme algoritmo oficial do Ministério da Saúde.
/// O CNS tem 15 dígitos e pode começar com 1, 2, 7, 8 ou 9.
/// - Iniciados em 1 ou 2: gerados a partir do CPF (definitivos)
/// - Iniciados em 7, 8 ou 9: provisórios
/// </summary>
public static class CnsValidator
{
    /// <summary>
    /// Valida um CNS conforme algoritmo oficial.
    /// </summary>
    public static bool IsValid(string? cns)
    {
        if (string.IsNullOrWhiteSpace(cns)) return false;

        // Remove espaços e pontos
        var cleaned = cns.Trim().Replace(" ", "").Replace(".", "").Replace("-", "");

        if (cleaned.Length != 15) return false;
        if (!cleaned.All(char.IsDigit)) return false;

        var firstDigit = cleaned[0];

        return firstDigit switch
        {
            '1' or '2' => ValidateDefinitive(cleaned),
            '7' or '8' or '9' => ValidateProvisional(cleaned),
            _ => false,
        };
    }

    /// <summary>
    /// Valida CNS definitivo (início 1 ou 2) — baseado em CPF, módulo 11.
    /// </summary>
    private static bool ValidateDefinitive(string cns)
    {
        // Soma ponderada: posição 1→15, peso 15→1
        long sum = 0;
        for (int i = 0; i < 15; i++)
        {
            sum += (cns[i] - '0') * (15 - i);
        }
        return sum % 11 == 0;
    }

    /// <summary>
    /// Valida CNS provisório (início 7, 8 ou 9) — módulo 11 com ajuste.
    /// </summary>
    private static bool ValidateProvisional(string cns)
    {
        long sum = 0;
        for (int i = 0; i < 15; i++)
        {
            sum += (cns[i] - '0') * (15 - i);
        }
        return sum % 11 == 0;
    }

    /// <summary>
    /// Formata CNS com espaços: 898 0012 3456 7890
    /// </summary>
    public static string Format(string cns)
    {
        var cleaned = cns.Trim().Replace(" ", "").Replace(".", "").Replace("-", "");
        if (cleaned.Length != 15) return cns;
        return $"{cleaned[..3]} {cleaned[3..7]} {cleaned[7..11]} {cleaned[11..15]}";
    }
}
