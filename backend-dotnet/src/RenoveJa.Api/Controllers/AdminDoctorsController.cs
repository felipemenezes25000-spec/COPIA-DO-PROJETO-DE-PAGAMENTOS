using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RenoveJa.Application.DTOs.Doctors;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services.Doctors;
using RenoveJa.Application.Services.Notifications;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Endpoints administrativos para aprovação de médicos.
/// A UI/admin será implementada externamente e irá consumir estas APIs.
/// </summary>
[ApiController]
[Route("api/admin/doctors")]
[Authorize(Roles = "admin")]
[EnableRateLimiting("admin")]  // NM-6: separate rate limit bucket from login "auth" policy
public class AdminDoctorsController(
    IDoctorRepository doctorRepository,
    IUserRepository userRepository,
    IPushNotificationDispatcher pushDispatcher,
    IDoctorAiAnalysisRepository aiAnalysisRepository,
    IDoctorAdminNoteRepository adminNoteRepository,
    ILogger<AdminDoctorsController> logger) : ControllerBase
{
    /// <summary>
    /// Lista médicos filtrando por status de aprovação.
    /// Exemplo: GET /api/admin/doctors?status=pending
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetDoctors(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        // NH-5: enforce pagination to prevent unbounded queries
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        DoctorApprovalStatus? filterStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalized = status.Trim().ToLowerInvariant();
            filterStatus = normalized switch
            {
                "approved" => DoctorApprovalStatus.Approved,
                "rejected" => DoctorApprovalStatus.Rejected,
                "pending" => DoctorApprovalStatus.Pending,
                _ => null
            };
        }

        var offset = (page - 1) * pageSize;
        var (pagedProfiles, totalCount) = await doctorRepository.GetPagedByApprovalStatusAsync(
            filterStatus, offset, pageSize, cancellationToken);

        if (totalCount == 0)
            return Ok(new { items = Array.Empty<DoctorListResponseDto>(), totalCount = 0, page, pageSize });

        var userIds = pagedProfiles.Select(d => d.UserId).Distinct();
        var users = await userRepository.GetByIdsAsync(userIds, cancellationToken);
        var userMap = users.ToDictionary(u => u.Id);

        var dtos = new List<DoctorListResponseDto>();
        foreach (var profile in pagedProfiles)
        {
            if (!userMap.TryGetValue(profile.UserId, out var user))
                continue;

            dtos.Add(MapToDto(profile, user));
        }

        return Ok(new { items = dtos, totalCount, page, pageSize });
    }

    /// <summary>
    /// GET /api/admin/doctors/{id} — retorna um único candidato com todos os campos
    /// reais persistidos. Substitui o workaround antigo do RH (que baixava a lista
    /// inteira e filtrava no cliente).
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDoctorById(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var profile = await doctorRepository.GetByIdAsync(id, cancellationToken);
        if (profile == null)
            return NotFound(new { error = "Médico não encontrado." });

        var user = await userRepository.GetByIdAsync(profile.UserId, cancellationToken);
        if (user == null)
            return NotFound(new { error = "Usuário associado ao médico não encontrado." });

        return Ok(MapToDto(profile, user));
    }

    private static DoctorListResponseDto MapToDto(
        Domain.Entities.DoctorProfile profile,
        Domain.Entities.User user)
    {
        return new DoctorListResponseDto(
            profile.Id,
            user.Name,
            user.Email,
            user.Phone?.Value,
            user.AvatarUrl,
            profile.Crm,
            profile.CrmState,
            profile.Specialty,
            profile.Bio,
            profile.Rating,
            profile.TotalConsultations,
            profile.Available,
            profile.ApprovalStatus.ToString().ToLowerInvariant(),
            user.BirthDate,
            user.Gender,
            profile.GraduationYear,
            user.Cpf,
            user.Street,
            user.Number,
            user.Neighborhood,
            user.Complement,
            user.City,
            user.State,
            user.PostalCode,
            profile.ProfessionalAddress,
            profile.ProfessionalPhone,
            profile.ProfessionalPostalCode,
            profile.ProfessionalStreet,
            profile.ProfessionalNumber,
            profile.ProfessionalNeighborhood,
            profile.ProfessionalComplement,
            profile.ProfessionalCity,
            profile.ProfessionalState,
            profile.University,
            profile.Courses,
            profile.HospitalsServices,
            profile.CreatedAt,
            profile.CurriculumUrl,
            profile.DiplomaUrl);
    }

    /// <summary>
    /// Aprova um médico para atuar na plataforma.
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> ApproveDoctor(
        Guid id,
        CancellationToken cancellationToken)
    {
        var profile = await doctorRepository.GetByIdAsync(id, cancellationToken);
        if (profile == null)
            return NotFound(new { error = "Médico não encontrado." });

        profile.Approve();
        profile = await doctorRepository.UpdateAsync(profile, cancellationToken);
        logger.LogInformation("Doctor approved by admin: doctorProfileId={DoctorProfileId}", id);

        // Notificar médico sobre aprovação (fire-and-forget)
        _ = pushDispatcher.SendAsync(
                PushNotificationRules.DoctorApprovedByAdmin(profile.UserId), CancellationToken.None)
            .ContinueWith(t =>
            {
                if (t.IsFaulted)
                    logger.LogWarning(t.Exception, "Failed to notify doctor about approval, DoctorProfileId={DoctorProfileId}", id);
            }, TaskContinuationOptions.OnlyOnFaulted);

        return Ok(new
        {
            id = profile.Id,
            approvalStatus = profile.ApprovalStatus.ToString().ToLowerInvariant(),
            available = profile.Available
        });
    }

    /// <summary>
    /// Reprova um médico para atuar na plataforma.
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> RejectDoctor(
        Guid id,
        [FromBody] AdminRejectDoctorRequest? body,
        CancellationToken cancellationToken)
    {
        var profile = await doctorRepository.GetByIdAsync(id, cancellationToken);
        if (profile == null)
            return NotFound(new { error = "Médico não encontrado." });

        profile.Reject();
        profile = await doctorRepository.UpdateAsync(profile, cancellationToken);

        logger.LogInformation("Doctor rejected by admin: doctorProfileId={DoctorProfileId}, reason={Reason}", id, body?.Reason);

        // TODO [NL-4]: Send email notification to the doctor informing them of the rejection.
        // Use IEmailService (add a SendDoctorRejectionEmailAsync method) with the doctor's email and body?.Reason.
        // The doctor's email can be retrieved via userRepository.GetByIdAsync(profile.UserId).

        // Notificar médico sobre rejeição (fire-and-forget)
        _ = pushDispatcher.SendAsync(
                PushNotificationRules.DoctorRejectedByAdmin(profile.UserId), CancellationToken.None)
            .ContinueWith(t =>
            {
                if (t.IsFaulted)
                    logger.LogWarning(t.Exception, "Failed to notify doctor about rejection, DoctorProfileId={DoctorProfileId}", id);
            }, TaskContinuationOptions.OnlyOnFaulted);

        return Ok(new
        {
            id = profile.Id,
            approvalStatus = profile.ApprovalStatus.ToString().ToLowerInvariant(),
            available = profile.Available,
            reason = body?.Reason
        });
    }

    // ============================================================
    // AI Analysis endpoints (módulo RH)
    // A frontend chama OpenAI e envia o resultado pronto para ser
    // persistido. O backend atua como store + fonte única de verdade
    // para dashboards compartilhados entre recrutadores.
    // ============================================================

    /// <summary>
    /// Persiste uma análise IA de candidato (o resultado já foi computado pela frontend).
    /// Histórico é preservado: uma nova linha é criada por chamada.
    /// </summary>
    [HttpPost("{id:guid}/ai-analysis")]
    public async Task<IActionResult> SaveAiAnalysis(
        Guid id,
        [FromBody] SaveAiAnalysisRequest body,
        CancellationToken cancellationToken)
    {
        if (body == null)
            return BadRequest(new { error = "Payload obrigatório." });

        if (body.Score < 0 || body.Score > 100)
            return BadRequest(new { error = "Score deve estar entre 0 e 100." });

        // Guard against oversized free-text payloads from a compromised client.
        const int maxFreeTextLength = 10_000;
        if ((body.Resumo?.Length ?? 0) > maxFreeTextLength ||
            (body.RecomendacaoTexto?.Length ?? 0) > maxFreeTextLength)
            return BadRequest(new { error = $"Campos de texto excedem {maxFreeTextLength} caracteres." });

        var profile = await doctorRepository.GetByIdAsync(id, cancellationToken);
        if (profile == null)
            return NotFound(new { error = "Candidato não encontrado." });

        DoctorAiAnalysis analysis;
        try
        {
            var pontosFortesJson = JsonSerializer.Serialize(body.PontosFortes ?? new List<string>());
            var pontosFracosJson = JsonSerializer.Serialize(body.PontosFracos ?? new List<string>());

            analysis = DoctorAiAnalysis.Create(
                doctorProfileId: id,
                score: body.Score,
                resumo: body.Resumo ?? string.Empty,
                pontosFortesJson: pontosFortesJson,
                pontosFracosJson: pontosFracosJson,
                recomendacao: body.Recomendacao ?? string.Empty,
                recomendacaoTexto: body.RecomendacaoTexto ?? string.Empty,
                model: body.Model ?? "gpt-4o-mini");
        }
        catch (RenoveJa.Domain.Exceptions.DomainException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var created = await aiAnalysisRepository.CreateAsync(analysis, cancellationToken);
        logger.LogInformation(
            "AI analysis saved: doctorProfileId={DoctorProfileId}, score={Score}, recomendacao={Recomendacao}",
            id, created.Score, created.Recomendacao);

        return Ok(ToDto(created));
    }

    /// <summary>
    /// Retorna a análise IA mais recente de um candidato.
    /// Quando o candidato ainda não foi analisado, devolve 200 com { analysis: null }
    /// — 404 aqui seria ruído no console do admin, já que "não analisado ainda" é estado normal.
    /// </summary>
    [HttpGet("{id:guid}/ai-analysis")]
    public async Task<IActionResult> GetAiAnalysis(
        Guid id,
        CancellationToken cancellationToken)
    {
        var analysis = await aiAnalysisRepository.GetLatestByDoctorProfileAsync(id, cancellationToken);
        if (analysis == null)
            return Ok(new { analysis = (object?)null });

        return Ok(ToDto(analysis));
    }

    /// <summary>
    /// Bulk-list de análises IA — uma linha (a mais recente) por candidato.
    ///
    /// Consumido por <c>fetchAllAIAnalyses</c> no rh-renoveja para hidratar
    /// todos os scores da lista de candidatos em UMA request em vez de N
    /// chamadas individuais de <c>GET /{id}/ai-analysis</c>. Devolve um array
    /// (possivelmente vazio), nunca 404 — "ninguém foi analisado ainda" é
    /// estado normal do sistema.
    /// </summary>
    [HttpGet("ai-analyses")]
    public async Task<IActionResult> GetAllAiAnalyses(CancellationToken cancellationToken)
    {
        var all = await aiAnalysisRepository.GetAllLatestAsync(cancellationToken);
        return Ok(all.Select(ToDto));
    }

    /// <summary>
    /// Retorna stats agregadas de todas as análises (uma mais recente por candidato).
    /// Consumido pelo dashboard do RH.
    /// </summary>
    [HttpGet("ai-analyses/stats")]
    public async Task<IActionResult> GetAiAnalysesStats(CancellationToken cancellationToken)
    {
        var all = await aiAnalysisRepository.GetAllLatestAsync(cancellationToken);

        var porRecomendacao = new Dictionary<string, int>
        {
            ["aprovar"] = 0,
            ["entrevistar"] = 0,
            ["analisar_mais"] = 0,
            ["rejeitar"] = 0
        };
        var distribuicaoScore = new Dictionary<string, int>
        {
            ["0-39"] = 0,
            ["40-59"] = 0,
            ["60-79"] = 0,
            ["80-100"] = 0
        };
        var scoreSum = 0;

        foreach (var a in all)
        {
            if (!string.IsNullOrEmpty(a.Recomendacao) && porRecomendacao.ContainsKey(a.Recomendacao))
                porRecomendacao[a.Recomendacao]++;

            var bucket = a.Score switch
            {
                < 40 => "0-39",
                < 60 => "40-59",
                < 80 => "60-79",
                _ => "80-100"
            };
            distribuicaoScore[bucket]++;
            scoreSum += a.Score;
        }

        var scoreMedio = all.Count > 0 ? (int)Math.Round((double)scoreSum / all.Count) : 0;

        return Ok(new
        {
            totalAnalisados = all.Count,
            scoreMedio,
            porRecomendacao,
            distribuicaoScore
        });
    }

    // ============================================================
    // Notas internas do RH (módulo RH)
    // Cada admin pode adicionar comentários sobre um candidato.
    // Histórico imutável: nunca editamos/apagamos notas.
    // ============================================================

    /// <summary>
    /// Lista as notas internas do RH para um candidato (mais recentes primeiro).
    /// </summary>
    [HttpGet("{id:guid}/notes")]
    public async Task<IActionResult> GetAdminNotes(
        Guid id,
        CancellationToken cancellationToken)
    {
        var profile = await doctorRepository.GetByIdAsync(id, cancellationToken);
        if (profile == null)
            return NotFound(new { error = "Candidato não encontrado." });

        var notes = await adminNoteRepository.GetByDoctorProfileAsync(id, cancellationToken);

        return Ok(notes.Select(n => new
        {
            id = n.Id,
            doctorProfileId = n.DoctorProfileId,
            authorUserId = n.AuthorUserId,
            authorName = n.AuthorName,
            text = n.Text,
            createdAt = n.CreatedAt
        }));
    }

    /// <summary>
    /// Cria uma nova nota interna sobre um candidato.
    /// O autor é extraído do JWT (admin autenticado).
    /// </summary>
    [HttpPost("{id:guid}/notes")]
    public async Task<IActionResult> AddAdminNote(
        Guid id,
        [FromBody] AddAdminNoteRequest body,
        CancellationToken cancellationToken)
    {
        if (body == null || string.IsNullOrWhiteSpace(body.Text))
            return BadRequest(new { error = "Texto da nota é obrigatório." });

        // Cap note length before hitting the domain to produce a clearer error and protect the DB.
        const int maxNoteLength = 5000;
        if (body.Text.Length > maxNoteLength)
            return BadRequest(new { error = $"Texto da nota excede o limite de {maxNoteLength} caracteres." });

        var profile = await doctorRepository.GetByIdAsync(id, cancellationToken);
        if (profile == null)
            return NotFound(new { error = "Candidato não encontrado." });

        var authorIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(authorIdRaw, out var authorId))
            return Unauthorized(new { error = "Token inválido." });

        var authorUser = await userRepository.GetByIdAsync(authorId, cancellationToken);
        var authorName = authorUser?.Name ?? "Admin";

        DoctorAdminNote note;
        try
        {
            note = DoctorAdminNote.Create(
                doctorProfileId: id,
                authorUserId: authorId,
                authorName: authorName,
                text: body.Text);
        }
        catch (RenoveJa.Domain.Exceptions.DomainException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var created = await adminNoteRepository.CreateAsync(note, cancellationToken);
        logger.LogInformation(
            "Admin note added: doctorProfileId={DoctorProfileId}, authorUserId={AuthorUserId}",
            id, authorId);

        return Ok(new
        {
            id = created.Id,
            doctorProfileId = created.DoctorProfileId,
            authorUserId = created.AuthorUserId,
            authorName = created.AuthorName,
            text = created.Text,
            createdAt = created.CreatedAt
        });
    }

    private static object ToDto(DoctorAiAnalysis a)
    {
        List<string> ParseArray(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        return new
        {
            id = a.Id,
            doctorProfileId = a.DoctorProfileId,
            score = a.Score,
            resumo = a.Resumo,
            pontosFortes = ParseArray(a.PontosFortesJson),
            pontosFracos = ParseArray(a.PontosFracosJson),
            recomendacao = a.Recomendacao,
            recomendacaoTexto = a.RecomendacaoTexto,
            model = a.Model,
            analyzedAt = a.AnalyzedAt,
            createdAt = a.CreatedAt
        };
    }
}

/// <summary>
/// Payload opcional para reprovar médico com motivo.
/// </summary>
public record AdminRejectDoctorRequest(string? Reason);

/// <summary>
/// Payload para salvar análise IA de candidato (gerada pela frontend via OpenAI).
/// </summary>
/// <summary>
/// Payload para criar uma nota interna do RH sobre um candidato.
/// </summary>
public record AddAdminNoteRequest(string Text);

public record SaveAiAnalysisRequest(
    int Score,
    string? Resumo,
    List<string>? PontosFortes,
    List<string>? PontosFracos,
    string? Recomendacao,
    string? RecomendacaoTexto,
    string? Model);

