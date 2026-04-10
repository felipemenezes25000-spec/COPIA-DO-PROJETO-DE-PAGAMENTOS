using Microsoft.Extensions.Logging;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.Transcription;

/// <summary>
/// Stub de transcrição. A transcrição em consulta é feita pelo Daily.co (Deepgram).
/// Este serviço retorna null — endpoints transcribe/transcribe-test ficam desabilitados.
/// </summary>
public class NoOpTranscriptionService : ITranscriptionService
{
    private readonly ILogger<NoOpTranscriptionService> _logger;

    public NoOpTranscriptionService(ILogger<NoOpTranscriptionService> logger)
    {
        _logger = logger;
    }

    public Task<string?> TranscribeAsync(
        byte[] audioBytes,
        string? fileName = null,
        string? previousContext = null,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("[Transcription] NoOp: transcrição feita pelo Daily.co. Ignorando áudio.");
        return Task.FromResult<string?>(null);
    }
}
