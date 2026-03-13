namespace RenoveJa.Application.Helpers;

/// <summary>
/// Validador de CBO (Classificação Brasileira de Ocupações) para fichas LEDI.
/// Cada tipo de ficha aceita apenas profissionais com CBOs específicos.
/// Referência: LEDI APS 7.3.7 — Grupos de CBO por tipo de ficha.
/// </summary>
public static class CboValidator
{
    // ── CBOs de nível superior em saúde (atendimento individual) ──
    private static readonly HashSet<string> CbosAtendimentoIndividual = new()
    {
        "225125", "225130", "225142", "225170", // Médicos (clínico, família, generalista, pediatra)
        "225124", "225135", "225140", "225150", "225155", "225160", "225165", "225175", "225180", "225185",
        "223505", "223510", "223515", "223520", "223525", // Enfermeiros
        "223905", "223910", "223915", // Dentistas (para odonto)
        "226105", "226110", "226115", // Fisioterapeutas
        "223810", // Nutricionistas
        "251510", "251520", "251530", "251540", "251545", "251550", // Psicólogos
        "223605", "223625", // Fonoaudiólogos
        "223405", // Farmacêuticos
        "251605", "251610", "251615", "251620", "251625", // Assistentes sociais
    };

    // ── CBOs de nível médio (procedimentos, visita domiciliar) ──
    private static readonly HashSet<string> CbosNivelMedio = new()
    {
        "322205", "322210", "322215", "322220", "322225", "322230", "322235", "322245", // Técnicos enfermagem
        "515105", "515110", "515120", "515125", "515130", "515135", "515140", // ACS
        "322405", "322410", "322415", "322420", "322425", // Técnicos odontologia
    };

    // ── CBOs permitidos para cada tipo de ficha LEDI ──
    private static readonly Dictionary<string, HashSet<string>> CbosPorFicha = new()
    {
        ["atendimento_individual"] = CbosAtendimentoIndividual,
        ["procedimentos"] = new(CbosAtendimentoIndividual.Concat(CbosNivelMedio)),
        ["visita_domiciliar"] = new(CbosAtendimentoIndividual.Concat(CbosNivelMedio)),
        ["atividade_coletiva"] = new(CbosAtendimentoIndividual.Concat(CbosNivelMedio)),
        ["vacinacao"] = new(CbosAtendimentoIndividual.Concat(CbosNivelMedio)),
    };

    /// <summary>
    /// Valida se um CBO é válido (formato correto: 6 dígitos).
    /// </summary>
    public static bool IsValidFormat(string? cbo)
    {
        if (string.IsNullOrWhiteSpace(cbo)) return false;
        var cleaned = cbo.Trim().Replace(".", "").Replace("-", "");
        return cleaned.Length == 6 && cleaned.All(char.IsDigit);
    }

    /// <summary>
    /// Valida se um CBO é permitido para um tipo de ficha LEDI.
    /// </summary>
    public static bool IsAllowedForFicha(string cbo, string tipoFicha)
    {
        if (!IsValidFormat(cbo)) return false;
        var cleaned = cbo.Trim().Replace(".", "").Replace("-", "");

        if (CbosPorFicha.TryGetValue(tipoFicha.ToLowerInvariant(), out var allowed))
        {
            return allowed.Contains(cleaned);
        }

        // Tipo de ficha desconhecido — aceita qualquer CBO válido
        return true;
    }

    /// <summary>
    /// Retorna a lista de CBOs permitidos para um tipo de ficha.
    /// </summary>
    public static IReadOnlySet<string> GetAllowedCbos(string tipoFicha)
    {
        return CbosPorFicha.TryGetValue(tipoFicha.ToLowerInvariant(), out var set)
            ? set
            : new HashSet<string>();
    }
}
