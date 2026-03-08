using System.Text;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Infrastructure.ConsultationAnamnesis;

/// <summary>
/// Store em memória (IMemoryCache) do estado da sessão de consulta por requestId.
/// Thread-safe por requestId via lock no objeto de estado.
/// Armazena segmentos com timestamp para gerar .txt no formato "Paciente minuto X segundo Y fala".
/// </summary>
public class ConsultationSessionStore : IConsultationSessionStore
{
    private const string KeyPrefix = "consultation_session_";
    private static readonly TimeSpan SessionExpiration = TimeSpan.FromHours(4);

    private readonly IMemoryCache _cache;
    private readonly ILogger<ConsultationSessionStore> _logger;

    public ConsultationSessionStore(IMemoryCache cache, ILogger<ConsultationSessionStore> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public void EnsureSession(Guid requestId, Guid patientId)
    {
        var key = KeyPrefix + requestId;
        var created = false;
        _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = SessionExpiration;
            created = true;
            return new SessionState(patientId);
        });
        if (created)
            _logger.LogInformation("[ConsultationSession] Sessão criada RequestId={RequestId} PatientId={PatientId}", requestId, patientId);
    }

    public void AppendTranscript(Guid requestId, string text, double? startTimeSeconds = null)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            _logger.LogDebug("[ConsultationSession] AppendTranscript ignorado: texto vazio RequestId={RequestId}", requestId);
            return;
        }
        var key = KeyPrefix + requestId;
        if (!_cache.TryGetValue(key, out SessionState? state) || state == null)
        {
            _logger.LogWarning("[ConsultationSession] TRANSCRICAO_PERDIDA: Sessão não encontrada ao append. RequestId={RequestId} textLen={Len}", requestId, text.Length);
            return;
        }
        var trimmed = text.Trim();
        var receivedAt = DateTime.UtcNow;
        string speaker;
        string segmentText;
        if (trimmed.StartsWith("[Médico]", StringComparison.OrdinalIgnoreCase))
        {
            speaker = "Médico";
            segmentText = trimmed.Length > 8 ? trimmed[8..].Trim() : string.Empty;
        }
        else if (trimmed.StartsWith("[Paciente]", StringComparison.OrdinalIgnoreCase))
        {
            speaker = "Paciente";
            segmentText = trimmed.Length > 10 ? trimmed[10..].Trim() : string.Empty;
        }
        else
        {
            speaker = "Transcrição";
            segmentText = trimmed;
        }
        lock (state.Lock)
        {
            state.TranscriptBuilder.Append(' ').Append(trimmed);
            if (!string.IsNullOrWhiteSpace(segmentText))
            {
                state.TranscriptSegments.Add(new TranscriptSegment(speaker, segmentText, receivedAt, startTimeSeconds));
            }
            _logger.LogDebug("[ConsultationSession] Transcript append RequestId={RequestId} totalLen={Len} segments={Count} startTime={StartTime}", requestId, state.TranscriptBuilder.Length, state.TranscriptSegments.Count, startTimeSeconds);
        }
    }

    public void UpdateAnamnesis(Guid requestId, string? anamnesisJson, string? suggestionsJson, string? evidenceJson = null)
    {
        var key = KeyPrefix + requestId;
        if (!_cache.TryGetValue(key, out SessionState? state) || state == null) return;
        lock (state.Lock)
        {
            if (anamnesisJson != null) state.AnamnesisJson = anamnesisJson;
            if (suggestionsJson != null) state.AiSuggestionsJson = suggestionsJson;
            if (evidenceJson != null) state.EvidenceJson = evidenceJson;
        }
    }

    public string GetTranscript(Guid requestId)
    {
        var key = KeyPrefix + requestId;
        if (!_cache.TryGetValue(key, out SessionState? state) || state == null) return string.Empty;
        lock (state.Lock)
        {
            return state.TranscriptBuilder.ToString().Trim();
        }
    }

    public (string? AnamnesisJson, string? SuggestionsJson) GetAnamnesisState(Guid requestId)
    {
        var key = KeyPrefix + requestId;
        if (!_cache.TryGetValue(key, out SessionState? state) || state == null) return (null, null);
        lock (state.Lock)
        {
            return (state.AnamnesisJson, state.AiSuggestionsJson);
        }
    }

    public ConsultationSessionData? GetAndRemove(Guid requestId)
    {
        var key = KeyPrefix + requestId;
        if (!_cache.TryGetValue(key, out SessionState? state) || state == null) return null;
        string transcript;
        IReadOnlyList<TranscriptSegment> segments;
        string? anamnesisJson;
        string? suggestionsJson;
        string? evidenceJson;
        lock (state.Lock)
        {
            transcript = state.TranscriptBuilder.ToString().Trim();
            segments = state.TranscriptSegments.ToList();
            anamnesisJson = state.AnamnesisJson;
            suggestionsJson = state.AiSuggestionsJson;
            evidenceJson = state.EvidenceJson;
        }
        _cache.Remove(key);
        return new ConsultationSessionData(requestId, state.PatientId, transcript, segments, anamnesisJson, suggestionsJson, evidenceJson);
    }

    private sealed class SessionState
    {
        public readonly object Lock = new();
        public readonly Guid PatientId;
        public readonly StringBuilder TranscriptBuilder = new();
        public readonly List<TranscriptSegment> TranscriptSegments = new();
        public string? AnamnesisJson;
        public string? AiSuggestionsJson;
        public string? EvidenceJson;

        public SessionState(Guid patientId)
        {
            PatientId = patientId;
        }
    }
}
