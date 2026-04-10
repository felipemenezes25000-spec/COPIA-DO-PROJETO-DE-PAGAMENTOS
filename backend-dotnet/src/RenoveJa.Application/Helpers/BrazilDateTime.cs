namespace RenoveJa.Application.Helpers;

/// <summary>
/// Helper para obter data/hora no fuso horário de Brasília (America/Sao_Paulo).
/// </summary>
public static class BrazilDateTime
{
    private static readonly TimeZoneInfo BrasiliaTimeZone;

    static BrazilDateTime()
    {
        try
        {
            // Linux/macOS use IANA IDs
            BrasiliaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        }
        catch (TimeZoneNotFoundException)
        {
            try
            {
                // Windows uses Windows IDs
                BrasiliaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");
            }
            catch (TimeZoneNotFoundException)
            {
                // Fallback: UTC-3
                BrasiliaTimeZone = TimeZoneInfo.CreateCustomTimeZone(
                    "BRT", TimeSpan.FromHours(-3), "Brasilia Standard Time", "Brasilia Standard Time");
            }
        }
    }

    /// <summary>Data/hora atual em horário de Brasília.</summary>
    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BrasiliaTimeZone);

    /// <summary>Formata data no padrão brasileiro (dd/MM/yyyy).</summary>
    public static string FormatDate(DateTime date) => date.ToString("dd/MM/yyyy");

    /// <summary>Formata data e hora no padrão brasileiro (dd/MM/yyyy HH:mm).</summary>
    public static string FormatDateTime(DateTime date) => date.ToString("dd/MM/yyyy HH:mm");

    /// <summary>Converte uma data UTC para o horário de Brasília (wall clock).</summary>
    public static DateTime ToBrasiliaWallClock(DateTime utcDate)
    {
        if (utcDate.Kind == DateTimeKind.Unspecified)
            utcDate = DateTime.SpecifyKind(utcDate, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(
            utcDate.Kind == DateTimeKind.Local ? utcDate.ToUniversalTime() : utcDate,
            BrasiliaTimeZone);
    }

    /// <summary>Formata data por extenso no padrão brasileiro (ex: "10 de abril de 2026").</summary>
    public static string FormatLongDate(DateTime date)
    {
        var culture = System.Globalization.CultureInfo.GetCultureInfo("pt-BR");
        return date.ToString("dd 'de' MMMM 'de' yyyy", culture);
    }
}
