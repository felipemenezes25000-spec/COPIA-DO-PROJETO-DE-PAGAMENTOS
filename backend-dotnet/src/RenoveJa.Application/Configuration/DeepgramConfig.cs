namespace RenoveJa.Application.Configuration;

/// <summary>
/// Configuração do Deepgram para transcrição de áudio (Speech-to-Text).
/// Variáveis de ambiente:
/// - DEEPGRAM_API_KEY
/// - DEEPGRAM_MODEL (opcional, padrão: nova-3)
/// - DEEPGRAM_LANGUAGE (opcional, padrão: pt-BR)
/// </summary>
public class DeepgramConfig
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "nova-3";
    public string Language { get; set; } = "pt-BR";
}
