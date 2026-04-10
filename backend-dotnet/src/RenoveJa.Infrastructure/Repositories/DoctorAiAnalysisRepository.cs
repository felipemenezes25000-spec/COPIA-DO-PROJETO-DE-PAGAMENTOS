using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Infrastructure.Data.Models;
using RenoveJa.Infrastructure.Data.Postgres;

namespace RenoveJa.Infrastructure.Repositories;

public class DoctorAiAnalysisRepository(PostgresClient db) : IDoctorAiAnalysisRepository
{
    private const string TableName = "doctor_ai_analyses";

    public async Task<DoctorAiAnalysis?> GetLatestByDoctorProfileAsync(
        Guid doctorProfileId,
        CancellationToken cancellationToken = default)
    {
        var models = await db.GetAllAsync<DoctorAiAnalysisModel>(
            TableName,
            filter: $"doctor_profile_id=eq.{doctorProfileId}",
            orderBy: "created_at.desc",
            limit: 1,
            cancellationToken: cancellationToken);

        return models.Count == 0 ? null : MapToDomain(models[0]);
    }

    public async Task<DoctorAiAnalysis> CreateAsync(
        DoctorAiAnalysis analysis,
        CancellationToken cancellationToken = default)
    {
        var created = await db.InsertAsync<DoctorAiAnalysisModel>(
            TableName,
            MapToModel(analysis),
            cancellationToken);
        return MapToDomain(created);
    }

    public async Task<List<DoctorAiAnalysis>> GetAllLatestAsync(
        CancellationToken cancellationToken = default)
    {
        // Retorna todas as linhas ordenadas; o dedupe por doctor_profile_id mantendo a mais recente
        // é feito em memória (para <1000 candidatos é trivial e evita window function no filter parser).
        var models = await db.GetAllAsync<DoctorAiAnalysisModel>(
            TableName,
            orderBy: "created_at.desc",
            cancellationToken: cancellationToken);

        var latestPerDoctor = models
            .GroupBy(m => m.DoctorProfileId)
            .Select(g => g.First()) // já está ordenado desc por created_at
            .Select(MapToDomain)
            .ToList();

        return latestPerDoctor;
    }

    private static DoctorAiAnalysis MapToDomain(DoctorAiAnalysisModel m)
    {
        return DoctorAiAnalysis.Reconstitute(
            m.Id,
            m.DoctorProfileId,
            m.Score,
            m.Resumo,
            m.PontosFortes,
            m.PontosFracos,
            m.Recomendacao,
            m.RecomendacaoTexto,
            m.Model,
            m.AnalyzedAt,
            m.CreatedAt);
    }

    private static DoctorAiAnalysisModel MapToModel(DoctorAiAnalysis a)
    {
        return new DoctorAiAnalysisModel
        {
            Id = a.Id,
            DoctorProfileId = a.DoctorProfileId,
            Score = a.Score,
            Resumo = a.Resumo,
            PontosFortes = a.PontosFortesJson,
            PontosFracos = a.PontosFracosJson,
            Recomendacao = a.Recomendacao,
            RecomendacaoTexto = a.RecomendacaoTexto,
            Model = a.Model,
            AnalyzedAt = a.AnalyzedAt,
            CreatedAt = a.CreatedAt
        };
    }
}
