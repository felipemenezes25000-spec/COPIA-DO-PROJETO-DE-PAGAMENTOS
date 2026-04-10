namespace RenoveJa.Application.DTOs.Rh;

/// <summary>
/// DTOs para o fluxo de IA do painel de RH (rh.renovejasaude.com.br).
/// Proxy seguro: o frontend NÃO chama OpenAI/Gemini direto — tudo passa pelo backend
/// para manter a chave fora do browser.
/// </summary>
public record RhGenerateBioRequest(
    string Categoria,
    string Especialidade,
    string AnosExperiencia,
    string? ExpTelemedicina = null,
    string? Graduacao = null,
    string? Universidade = null,
    string? PosGraduacao = null,
    string? Residencia = null);

public record RhGenerateBioResponse(string Bio);

public record RhAnalyzeCandidateRequest(
    string Nome,
    string Categoria,
    string Especialidade,
    string AnosExperiencia,
    string? ExpTelemedicina,
    string? Sobre,
    string Graduacao,
    string Universidade,
    int AnoConclusao,
    string? PosGraduacao,
    string? Residencia);

public record RhCandidateAnalysis(
    int Score,
    string Resumo,
    List<string> PontosFortes,
    List<string> PontosFracos,
    string Recomendacao,
    string RecomendacaoTexto);
