using System.Text.RegularExpressions;

namespace RenoveJa.Infrastructure.AiReading;

public static class PromptSanitizer
{
    private const int MaxLength = 10_000;

    private static readonly Regex InjectionPattern = new(
        @"(?i)(ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?))|" +
        @"(disregard\s+(previous|all|above))|" +
        @"(you\s+are\s+now\s+)|" +
        @"(new\s+instructions?\s*:)|" +
        @"(forget\s+(everything|all|previous))|" +
        @"(do\s+not\s+follow)|" +
        @"(override\s+(system|instructions?))|" +
        // Portuguese prompt injection patterns
        @"(ignor[ea]\s+(as\s+)?instru[çc][õo]es)|" +
        @"(esque[çc]a\s+(as\s+)?instru[çc][õo]es)|" +
        @"(ignor[ea]\s+o\s+prompt)|" +
        @"(novo\s+prompt)|" +
        @"(instru[çc][õo]es\s+do\s+sistema)|" +
        @"(finja\s+ser)|" +
        @"(aja\s+como)",
        RegexOptions.Compiled);

    private static readonly Regex RolePrefixPattern = new(
        @"(?i)^(system|assistant|user)\s*:",
        RegexOptions.Compiled | RegexOptions.Multiline);

    private static readonly Regex MarkdownPattern = new(
        @"[`*_~#\[\]]{2,}|^#{1,6}\s|```",
        RegexOptions.Compiled | RegexOptions.Multiline);

    // LGPD PII redaction — applied in order to avoid pattern collisions
    // CPF before RG: CPF (\d{3}.\d{3}.\d{3}-\d{2}) would otherwise be partially caught by RG
    private static readonly Regex CpfPattern = new(
        @"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b",
        RegexOptions.Compiled);

    private static readonly Regex CnpjPattern = new(
        @"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b",
        RegexOptions.Compiled);

    private static readonly Regex CrmPattern = new(
        @"\bCRM[/\s-]?[A-Z]{2}[\s-]?\d{4,7}\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex RgPattern = new(
        @"\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dxX]\b",
        RegexOptions.Compiled);

    private static readonly Regex PhonePattern = new(
        @"\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b",
        RegexOptions.Compiled);

    private static readonly Regex EmailPattern = new(
        @"\b[\w.+-]+@[\w-]+\.[\w.-]+\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static string SanitizeForPrompt(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        var s = input.Trim();

        if (s.Length > MaxLength)
            s = s[..MaxLength];

        s = InjectionPattern.Replace(s, "[removido]");
        s = RolePrefixPattern.Replace(s, "[removido]:");
        s = MarkdownPattern.Replace(s, "");

        return RedactPii(s);
    }

    /// <summary>
    /// Remove apenas PII (LGPD) sem truncar tamanho nem mexer em markdown/injection.
    /// Use para textos longos (transcripts de consulta, anamnese) onde queremos preservar
    /// o conteúdo completo e apenas proteger dados pessoais antes de enviar a LLM externa.
    /// </summary>
    public static string RedactPiiOnly(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;
        return RedactPii(input);
    }

    private static string RedactPii(string s)
    {
        // PII redaction (LGPD) — CPF must precede RG to avoid partial collision
        s = CpfPattern.Replace(s, "[CPF_REDACTED]");
        s = CnpjPattern.Replace(s, "[CNPJ_REDACTED]");
        s = CrmPattern.Replace(s, "[CRM_REDACTED]");
        s = RgPattern.Replace(s, "[RG_REDACTED]");
        s = PhonePattern.Replace(s, "[PHONE_REDACTED]");
        s = EmailPattern.Replace(s, "[EMAIL_REDACTED]");
        return s;
    }
}
