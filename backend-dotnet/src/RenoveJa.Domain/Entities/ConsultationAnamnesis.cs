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
        AnamnesisJson = anamnesisJson;
        AiSuggestionsJson = aiSuggestionsJson;
        EvidenceJson = evidenceJson;
    }

    public static ConsultationAnamnesis Create(Guid requestId, Guid patientId, string? transcriptText, string? transcriptFileUrl, string? anamnesisJson, string? aiSuggestionsJson, string? evidenceJson = null)
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
            anamnesisJson,
            aiSuggestionsJson,
            evidenceJson,
            createdAt);
    }

    public void Update(string? transcriptText, string? transcriptFileUrl, string? anamnesisJson, string? aiSuggestionsJson, string? evidenceJson = null)
    {
        TranscriptText = transcriptText;
        TranscriptFileUrl = transcriptFileUrl;
        AnamnesisJson = anamnesisJson;
        AiSuggestionsJson = aiSuggestionsJson;
        EvidenceJson = evidenceJson;
    }
}
