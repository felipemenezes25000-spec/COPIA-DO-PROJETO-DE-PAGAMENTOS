namespace RenoveJa.Domain.Entities;

/// <summary>
/// Registro de transcrição e anamnese gerados durante uma consulta por vídeo (um por request).
/// </summary>
public class ConsultationAnamnesis : Entity
{
    public Guid RequestId { get; private set; }
    public Guid PatientId { get; private set; }
    public string? TranscriptText { get; private set; }
    public string? TranscriptFileUrl { get; private set; }
    /// <summary>URL da gravação de vídeo da consulta (vídeo + áudio) no S3.</summary>
    public string? RecordingFileUrl { get; private set; }
    public string? AnamnesisJson { get; private set; }
    public string? AiSuggestionsJson { get; private set; }
    public string? EvidenceJson { get; private set; }

    private ConsultationAnamnesis() : base()
    { }

    private ConsultationAnamnesis(
        Guid id,
        Guid requestId,
        Guid patientId,
        string? transcriptText,
        string? transcriptFileUrl,
        string? recordingFileUrl,
        string? anamnesisJson,
        string? aiSuggestionsJson,
        string? evidenceJson,
        DateTime createdAt)
        : base(id, createdAt)
    {
        RequestId = requestId;
        PatientId = patientId;
        TranscriptText = transcriptText;
        TranscriptFileUrl = transcriptFileUrl;
        RecordingFileUrl = recordingFileUrl;
        AnamnesisJson = anamnesisJson;
        AiSuggestionsJson = aiSuggestionsJson;
        EvidenceJson = evidenceJson;
    }

    public static ConsultationAnamnesis Create(Guid requestId, Guid patientId, string? transcriptText, string? transcriptFileUrl, string? recordingFileUrl, string? anamnesisJson, string? aiSuggestionsJson, string? evidenceJson = null)
    {
        if (requestId == Guid.Empty)
            throw new Domain.Exceptions.DomainException("Request ID is required");
        if (patientId == Guid.Empty)
            throw new Domain.Exceptions.DomainException("Patient ID is required");

        return new ConsultationAnamnesis(
            Guid.NewGuid(),
            requestId,
            patientId,
            transcriptText,
            transcriptFileUrl,
            recordingFileUrl,
            anamnesisJson,
            aiSuggestionsJson,
            evidenceJson,
            DateTime.UtcNow);
    }

    public static ConsultationAnamnesis Reconstitute(
        Guid id,
        Guid requestId,
        Guid patientId,
        string? transcriptText,
        string? transcriptFileUrl,
        string? recordingFileUrl,
        string? anamnesisJson,
        string? aiSuggestionsJson,
        string? evidenceJson,
        DateTime createdAt)
    {
        return new ConsultationAnamnesis(
            id,
            requestId,
            patientId,
            transcriptText,
            transcriptFileUrl,
            recordingFileUrl,
            anamnesisJson,
            aiSuggestionsJson,
            evidenceJson,
            createdAt);
    }

    public void Update(string? transcriptText, string? transcriptFileUrl, string? recordingFileUrl, string? anamnesisJson, string? aiSuggestionsJson, string? evidenceJson = null)
    {
        TranscriptText = transcriptText;
        TranscriptFileUrl = transcriptFileUrl;
        if (recordingFileUrl != null) RecordingFileUrl = recordingFileUrl;
        AnamnesisJson = anamnesisJson;
        AiSuggestionsJson = aiSuggestionsJson;
        EvidenceJson = evidenceJson;
    }

    /// <summary>Atualiza apenas a URL da gravação (chamado pelo webhook Daily).</summary>
    public void SetRecordingFileUrl(string? url)
    {
        RecordingFileUrl = url;
    }
}
