namespace RenoveJa.Application.Configuration;

/// <summary>
/// Configuração para integração com OpenAI e Gemini — leitura de receitas, anamnese e evidências.
/// Padrão: Gemini__ApiKey configurada → anamnese e evidências usam gemini-2.5-flash. Pronto.
/// OpenAI__ApiKey: fallback quando Gemini__ApiKey ausente. Transcrição: Daily.co (não Whisper).
/// </summary>
public class OpenAIConfig
{
    public const string SectionName = "OpenAI";

    public string ApiKey { get; set; } = string.Empty;
    /// <summary>Modelo padrão (fallback quando Gemini__ApiKey ausente). OpenAI-only.</summary>
    public string Model { get; set; } = "gpt-4o";
    /// <summary>Modelo para anamnese. Padrão: gemini-2.5-flash (Gemini). Fallback OpenAI se Gemini__ApiKey ausente.</summary>
    public string ModelAnamnesis { get; set; } = "gemini-2.5-flash";
    /// <summary>Modelo para evidências. Padrão: gemini-2.5-flash (Gemini). Fallback OpenAI se Gemini__ApiKey ausente.</summary>
    public string ModelEvidence { get; set; } = "gemini-2.5-flash";

    /// <summary>Chave da API Gemini (env: Gemini__ApiKey). Usada para anamnese e evidências quando configurada.</summary>
    public string GeminiApiKey { get; set; } = string.Empty;
    /// <summary>URL base da API Gemini (compatível OpenAI). Padrão: generativelanguage.googleapis.com/v1beta/openai</summary>
    public string GeminiApiBaseUrl { get; set; } = string.Empty;
}
