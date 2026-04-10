using RenoveJa.Domain.Exceptions;

namespace RenoveJa.Domain.Entities;

/// <summary>
/// Análise de IA gerada pelo RH para avaliar um candidato (doctor_profile).
/// Armazena o resultado já computado pela frontend — o backend atua como store.
/// Uma nova linha é criada a cada re-análise; o histórico é preservado.
/// Foreign key é doctor_profile_id (id da tabela doctor_profiles).
/// </summary>
public class DoctorAiAnalysis : AggregateRoot
{
    public Guid DoctorProfileId { get; private set; }
    public int Score { get; private set; }
    public string Resumo { get; private set; } = string.Empty;
    public string PontosFortesJson { get; private set; } = "[]";
    public string PontosFracosJson { get; private set; } = "[]";
    public string Recomendacao { get; private set; } = string.Empty;
    public string RecomendacaoTexto { get; private set; } = string.Empty;
    public string Model { get; private set; } = string.Empty;
    public DateTime AnalyzedAt { get; private set; }

    private static readonly HashSet<string> ValidRecommendations = new(StringComparer.OrdinalIgnoreCase)
    {
        "aprovar", "entrevistar", "analisar_mais", "rejeitar"
    };

    private DoctorAiAnalysis() : base() { }

    private DoctorAiAnalysis(
        Guid id,
        Guid doctorProfileId,
        int score,
        string resumo,
        string pontosFortesJson,
        string pontosFracosJson,
        string recomendacao,
        string recomendacaoTexto,
        string model,
        DateTime analyzedAt,
        DateTime createdAt) : base(id, createdAt)
    {
        DoctorProfileId = doctorProfileId;
        Score = score;
        Resumo = resumo;
        PontosFortesJson = pontosFortesJson;
        PontosFracosJson = pontosFracosJson;
        Recomendacao = recomendacao;
        RecomendacaoTexto = recomendacaoTexto;
        Model = model;
        AnalyzedAt = analyzedAt;
    }

    public static DoctorAiAnalysis Create(
        Guid doctorProfileId,
        int score,
        string resumo,
        string pontosFortesJson,
        string pontosFracosJson,
        string recomendacao,
        string recomendacaoTexto,
        string model)
    {
        if (doctorProfileId == Guid.Empty)
            throw new DomainException("DoctorProfileId is required");
        if (score < 0 || score > 100)
            throw new DomainException("Score must be between 0 and 100");
        if (string.IsNullOrWhiteSpace(resumo))
            throw new DomainException("Resumo is required");
        if (string.IsNullOrWhiteSpace(recomendacao))
            throw new DomainException("Recomendacao is required");
        if (!ValidRecommendations.Contains(recomendacao.Trim()))
            throw new DomainException($"Recomendacao must be one of: {string.Join(", ", ValidRecommendations)}");
        if (string.IsNullOrWhiteSpace(model))
            throw new DomainException("Model is required");

        var now = DateTime.UtcNow;
        return new DoctorAiAnalysis(
            Guid.NewGuid(),
            doctorProfileId,
            score,
            resumo.Trim(),
            string.IsNullOrWhiteSpace(pontosFortesJson) ? "[]" : pontosFortesJson,
            string.IsNullOrWhiteSpace(pontosFracosJson) ? "[]" : pontosFracosJson,
            recomendacao.Trim().ToLowerInvariant(),
            recomendacaoTexto?.Trim() ?? string.Empty,
            model.Trim(),
            now,
            now);
    }

    public static DoctorAiAnalysis Reconstitute(
        Guid id,
        Guid doctorProfileId,
        int score,
        string resumo,
        string pontosFortesJson,
        string pontosFracosJson,
        string recomendacao,
        string recomendacaoTexto,
        string model,
        DateTime analyzedAt,
        DateTime createdAt)
    {
        return new DoctorAiAnalysis(
            id,
            doctorProfileId,
            score,
            resumo ?? string.Empty,
            string.IsNullOrWhiteSpace(pontosFortesJson) ? "[]" : pontosFortesJson,
            string.IsNullOrWhiteSpace(pontosFracosJson) ? "[]" : pontosFracosJson,
            recomendacao ?? string.Empty,
            recomendacaoTexto ?? string.Empty,
            model ?? string.Empty,
            analyzedAt,
            createdAt);
    }
}
