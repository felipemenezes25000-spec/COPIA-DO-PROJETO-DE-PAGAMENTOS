namespace RenoveJa.Application.Interfaces;

/// <summary>
/// Serviço de transcrição de áudio (Speech-to-Text) para consultas por vídeo.
/// Stub: transcrição é feita exclusivamente pelo Daily.co (Deepgram) no cliente.
/// </summary>
public interface ITranscriptionService
{
    /// <summary>
    /// Transcreve um chunk de áudio para texto.
    /// </summary>
    /// <param name="audioBytes">Bytes do áudio. Ignorado — transcrição via Daily.co.</param>
    /// <param name="fileName">Nome do arquivo para hint de formato (ex.: "chunk.webm"). Opcional.</param>
    /// <param name="previousContext">Ignorado. Opcional.</param>
    /// <param name="cancellationToken">Cancelamento.</param>
    /// <returns>Texto transcrito ou null se API não configurada/falha.</returns>
    Task<string?> TranscribeAsync(
        byte[] audioBytes,
        string? fileName = null,
        string? previousContext = null,
        CancellationToken cancellationToken = default);
}
