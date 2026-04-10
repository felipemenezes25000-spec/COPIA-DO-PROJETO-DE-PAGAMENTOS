using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RenoveJa.Application.DTOs.Rh;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Endpoints de IA para o painel de RH (rh.renovejasaude.com.br).
/// Proxy seguro: o browser não enxerga a chave OpenAI/Gemini.
/// </summary>
[ApiController]
[Route("api/rh/ai")]
public class RhAiController(
    IRhAiService rhAiService,
    ILogger<RhAiController> logger) : ControllerBase
{
    /// <summary>
    /// Gera o texto "Sobre você" do candidato durante o cadastro.
    /// Não requer autenticação (candidato ainda não está logado).
    /// Rate limited pela policy "register" para evitar abuso.
    /// </summary>
    // Hard caps defensivos para os campos do candidato antes de enviá-los ao LLM:
    // evita prompt-injection / token blow-up via payloads gigantes.
    private const int MaxShortField = 200;
    private const int MaxBioContextField = 500;
    private const int MaxNameField = 200;

    [HttpPost("generate-bio")]
    [AllowAnonymous]
    [EnableRateLimiting("register")]
    public async Task<IActionResult> GenerateBio(
        [FromBody] RhGenerateBioRequest? request,
        CancellationToken ct)
    {
        if (request is null
            || string.IsNullOrWhiteSpace(request.Categoria)
            || string.IsNullOrWhiteSpace(request.Especialidade))
            return BadRequest(new { error = "Categoria e especialidade são obrigatórios." });

        if (request.Categoria.Length > MaxShortField
            || request.Especialidade.Length > MaxShortField
            || (request.AnosExperiencia?.Length ?? 0) > MaxShortField
            || (request.ExpTelemedicina?.Length ?? 0) > MaxShortField
            || (request.Graduacao?.Length ?? 0) > MaxShortField
            || (request.Universidade?.Length ?? 0) > MaxShortField
            || (request.PosGraduacao?.Length ?? 0) > MaxBioContextField
            || (request.Residencia?.Length ?? 0) > MaxBioContextField)
        {
            return BadRequest(new { error = "Um ou mais campos excedem o tamanho máximo permitido." });
        }

        var bio = await rhAiService.GenerateBioAsync(request, ct);
        if (string.IsNullOrWhiteSpace(bio))
        {
            logger.LogWarning("RH AI generate-bio returned empty for categoria={Categoria}", request.Categoria);
            return StatusCode(502, new { error = "Não foi possível gerar a bio. Tente novamente." });
        }

        return Ok(new RhGenerateBioResponse(bio));
    }

    /// <summary>
    /// Analisa o perfil de um candidato (score + recomendação) para o painel admin RH.
    /// Requer role admin.
    /// </summary>
    [HttpPost("analyze-candidate")]
    [Authorize(Roles = "admin")]
    [EnableRateLimiting("admin")]
    public async Task<IActionResult> AnalyzeCandidate(
        [FromBody] RhAnalyzeCandidateRequest? request,
        CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Nome))
            return BadRequest(new { error = "Dados do candidato são obrigatórios." });

        if (request.Nome.Length > MaxNameField
            || request.Categoria.Length > MaxShortField
            || request.Especialidade.Length > MaxShortField
            || request.AnosExperiencia.Length > MaxShortField
            || (request.ExpTelemedicina?.Length ?? 0) > MaxShortField
            || (request.Sobre?.Length ?? 0) > 4000
            || request.Graduacao.Length > MaxShortField
            || request.Universidade.Length > MaxShortField
            || (request.PosGraduacao?.Length ?? 0) > MaxBioContextField
            || (request.Residencia?.Length ?? 0) > MaxBioContextField)
        {
            return BadRequest(new { error = "Um ou mais campos excedem o tamanho máximo permitido." });
        }

        // Sanity check no ano de conclusão: evita datas absurdas sendo enviadas ao LLM.
        var currentYear = DateTime.UtcNow.Year;
        if (request.AnoConclusao < 1950 || request.AnoConclusao > currentYear + 1)
            return BadRequest(new { error = "Ano de conclusão inválido." });

        var analysis = await rhAiService.AnalyzeCandidateAsync(request, ct);
        if (analysis is null)
        {
            logger.LogWarning("RH AI analyze-candidate returned null for nome={Nome}", request.Nome);
            return StatusCode(502, new { error = "Não foi possível analisar o candidato." });
        }

        return Ok(analysis);
    }
}
