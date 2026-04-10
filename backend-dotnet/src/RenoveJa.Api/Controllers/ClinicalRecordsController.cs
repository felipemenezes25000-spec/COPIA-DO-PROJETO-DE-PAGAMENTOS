using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services.Clinical;
using RenoveJa.Domain.Interfaces;
using RenoveJa.Infrastructure.Video;
using System.Security.Claims;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Controller responsável por dados clínicos do paciente: prontuário, perfil,
/// resumos, documentos, imagens de receita/exame, gravações e transcrições.
/// Extraído de RequestsController para manter responsabilidade única.
/// </summary>
[ApiController]
[Route("api/requests")]
[Authorize]
public class ClinicalRecordsController(
    IRequestService requestService,
    IClinicalSummaryService clinicalSummaryService,
    IPatientClinicalHistoryService patientClinicalHistoryService,
    IDoctorPatientNotesRepository doctorPatientNotesRepository,
    IDoctorRepository doctorRepository,
    IAuditEventService auditEventService,
    IAuditService auditService,
    IDocumentTokenService documentTokenService,
    IRequestRepository requestRepository,
    IDailyVideoService dailyVideoService,
    IOptions<DailyConfig> dailyConfig,
    ILogger<ClinicalRecordsController> logger) : ControllerBase
{
    // ───────────────────── Helpers ─────────────────────

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID");
        return userId;
    }

    private static readonly HashSet<string> ValidNoteTypes = ["progress_note", "clinical_impression", "addendum", "observation"];

    private static readonly HashSet<string> ValidSensitivities = ["general", "specialty_only", "author_only"];

    private static RenoveJa.Domain.Enums.NoteSensitivity ParseSensitivityOrDefault(string? raw) =>
        (raw ?? "general").Trim().ToLowerInvariant() switch
        {
            "specialty_only" => RenoveJa.Domain.Enums.NoteSensitivity.SpecialtyOnly,
            "author_only" => RenoveJa.Domain.Enums.NoteSensitivity.AuthorOnly,
            _ => RenoveJa.Domain.Enums.NoteSensitivity.General
        };

    private static string SerializeSensitivity(RenoveJa.Domain.Enums.NoteSensitivity s) => s switch
    {
        RenoveJa.Domain.Enums.NoteSensitivity.SpecialtyOnly => "specialty_only",
        RenoveJa.Domain.Enums.NoteSensitivity.AuthorOnly => "author_only",
        _ => "general"
    };

    /// <summary>
    /// Mapeia a entidade do repositório para o DTO da API, marcando a flag
    /// <c>IsMaskedForViewer</c> quando o visualizador recebeu o resumo ao invés
    /// do conteúdo bruto (nota author_only lida por terceiro — CFP 001/2009).
    /// </summary>
    private static DoctorNoteDto MapNoteToDto(DoctorPatientNoteEntity n, Guid viewerDoctorId)
    {
        var isMasked = n.Sensitivity == RenoveJa.Domain.Enums.NoteSensitivity.AuthorOnly
                       && n.DoctorId != viewerDoctorId;
        return new DoctorNoteDto(
            n.Id,
            n.NoteType,
            n.Content,
            SerializeSensitivity(n.Sensitivity),
            n.AuthorSpecialty,
            n.SummaryForTeam,
            isMasked,
            n.RequestId,
            n.CreatedAt,
            n.UpdatedAt);
    }

    private async Task<string?> GetViewerSpecialtyAsync(Guid doctorUserId, CancellationToken ct)
    {
        var profile = await doctorRepository.GetByUserIdAsync(doctorUserId, ct);
        return profile?.Specialty;
    }

    /// <summary>
    /// Registra auditoria de leitura para notas sensíveis (Specialty/Author-only).
    /// Exigido por CFP 001/2009 e LGPD Art. 11. Fire-and-forget: falha aqui não
    /// deve bloquear a resposta ao médico, mas é logada.
    /// </summary>
    private async Task LogSensitiveNoteReadsAsync(
        IReadOnlyList<DoctorPatientNoteEntity> notes,
        Guid viewerDoctorId,
        string? viewerSpecialty,
        string accessReason,
        CancellationToken cancellationToken)
    {
        foreach (var note in notes)
        {
            if (note.Sensitivity == RenoveJa.Domain.Enums.NoteSensitivity.General) continue;
            try
            {
                await doctorPatientNotesRepository.LogAccessAsync(
                    note.Id, viewerDoctorId, viewerSpecialty, accessReason, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex,
                    "Falha ao registrar note_access_audit noteId={NoteId} viewer={ViewerId}",
                    note.Id, viewerDoctorId);
            }
        }
    }

    /// <summary>
    /// Detecta o content type real a partir dos magic bytes do arquivo.
    /// Fallback para application/octet-stream se não reconhecido.
    /// </summary>
    private static string DetectContentType(byte[] data)
    {
        if (data.Length >= 4)
        {
            // JPEG: FF D8 FF
            if (data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF)
                return "image/jpeg";
            // PNG: 89 50 4E 47
            if (data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47)
                return "image/png";
            // PDF: 25 50 44 46 (%PDF)
            if (data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46)
                return "application/pdf";
            // RIFF....WEBP
            if (data.Length >= 12 && data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46
                && data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50)
                return "image/webp";
        }
        return "application/octet-stream";
    }

    // ───────────────────── Endpoints ─────────────────────

    /// <summary>
    /// Médico obtém histórico de solicitações do paciente (prontuário).
    /// </summary>
    [HttpGet("by-patient/{patientId}")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> GetPatientRequests(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var doctorId = GetUserId();
        var requests = await requestService.GetPatientRequestsAsync(doctorId, patientId, cancellationToken);
        _ = auditEventService.LogReadAsync(doctorId, "PatientRequests", patientId, "api", HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken: CancellationToken.None)
            .ContinueWith(t =>
            {
                if (t.IsFaulted)
                    logger.LogWarning(t.Exception, "Audit log failed for PatientRequests read by DoctorId={DoctorId}, PatientId={PatientId}", doctorId, patientId);
            }, TaskContinuationOptions.OnlyOnFaulted);
        return Ok(requests);
    }

    /// <summary>
    /// Médico obtém perfil do paciente (dados cadastrais) para identificação. Somente quando tem acesso ao prontuário.
    /// </summary>
    [HttpGet("by-patient/{patientId}/profile")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> GetPatientProfile(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var doctorId = GetUserId();
        var profile = await requestService.GetPatientProfileForDoctorAsync(doctorId, patientId, cancellationToken);
        if (profile == null)
            return NotFound(new { error = "Paciente não encontrado ou sem acesso." });
        _ = auditEventService.LogReadAsync(doctorId, "PatientProfile", patientId, "api", HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken: CancellationToken.None)
            .ContinueWith(t =>
            {
                if (t.IsFaulted)
                    logger.LogWarning(t.Exception, "Audit log failed for PatientProfile read by DoctorId={DoctorId}, PatientId={PatientId}", doctorId, patientId);
            }, TaskContinuationOptions.OnlyOnFaulted);
        return Ok(profile);
    }

    /// <summary>
    /// Médico obtém resumo narrativo completo do prontuário (IA). Consolida consultas, receitas e exames em um texto único.
    /// </summary>
    [HttpGet("by-patient/{patientId}/summary")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> GetPatientClinicalSummary(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var doctorId = GetUserId();
        var history = await patientClinicalHistoryService.BuildAsync(doctorId, patientId, cancellationToken);

        if (history.IsEmpty)
        {
            var emptyViewerSpecialty = await GetViewerSpecialtyAsync(doctorId, cancellationToken);
            var emptyNotes = await doctorPatientNotesRepository.GetVisibleNotesAsync(doctorId, emptyViewerSpecialty, patientId, cancellationToken);
            var emptyDoctorNotes = emptyNotes.Select(n => MapNoteToDto(n, doctorId)).ToList();
            // CFP 001/2009 / LGPD Art. 11: mesmo no branch vazio, leituras de notas sensíveis precisam ser auditadas.
            await LogSensitiveNoteReadsAsync(emptyNotes, doctorId, emptyViewerSpecialty, "patient_clinical_summary_empty", cancellationToken);
            return Ok(new { summary = (string?)null, fallback = (string?)null, doctorNotes = emptyDoctorNotes });
        }

        var input = history.ToSummaryInput();

        var structured = await clinicalSummaryService.GenerateStructuredAsync(input, cancellationToken);
        string? narrative = structured?.NarrativeSummary;
        string? fallback = null;

        if (string.IsNullOrWhiteSpace(narrative))
        {
            narrative = await clinicalSummaryService.GenerateAsync(input, cancellationToken);
            if (string.IsNullOrWhiteSpace(narrative))
            {
                fallback = patientClinicalHistoryService.BuildFallbackSummary(history);
                narrative = fallback;
            }
        }

        var structuredDto = structured != null ? new
        {
            problemList = structured.ProblemList,
            activeMedications = structured.ActiveMedications,
            narrativeSummary = narrative,
            alerts = structured.Alerts
        } : (object?)null;

        var viewerSpecialty = await GetViewerSpecialtyAsync(doctorId, cancellationToken);
        var notes = await doctorPatientNotesRepository.GetVisibleNotesAsync(doctorId, viewerSpecialty, patientId, cancellationToken);
        var doctorNotes = notes.Select(n => MapNoteToDto(n, doctorId)).ToList();

        // Phase C compliance: registra auditoria de leitura para notas sensíveis (CFP/LGPD).
        // Só loga notas não-General para não inundar a tabela com ruído.
        await LogSensitiveNoteReadsAsync(notes, doctorId, viewerSpecialty, "patient_clinical_summary", cancellationToken);

        _ = auditEventService.LogReadAsync(doctorId, "PatientClinicalSummary", patientId, "api", HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken: CancellationToken.None)
            .ContinueWith(t =>
            {
                if (t.IsFaulted)
                    logger.LogWarning(t.Exception, "Audit log failed for PatientClinicalSummary read by DoctorId={DoctorId}, PatientId={PatientId}", doctorId, patientId);
            }, TaskContinuationOptions.OnlyOnFaulted);

        return Ok(new { summary = narrative, fallback, structured = structuredDto, doctorNotes });
    }

    /// <summary>
    /// Médico adiciona nota clínica ao prontuário do paciente.
    /// Tipos: progress_note (evolução), clinical_impression (impressão diagnóstica), addendum (complemento), observation (observação livre).
    /// </summary>
    [HttpPost("by-patient/{patientId}/doctor-notes")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> AddDoctorPatientNote(
        Guid patientId,
        [FromBody] CreateDoctorNoteDto dto,
        CancellationToken cancellationToken)
    {
        var doctorId = GetUserId();
        var requests = await requestService.GetPatientRequestsAsync(doctorId, patientId, cancellationToken);
        if (requests.Count == 0)
            return NotFound(new { error = "Paciente não encontrado ou sem acesso ao prontuário." });

        var noteType = (dto.NoteType ?? "progress_note").Trim().ToLowerInvariant();
        if (!ValidNoteTypes.Contains(noteType))
            return BadRequest(new { error = $"Tipo inválido. Use: {string.Join(", ", ValidNoteTypes)}" });

        var content = (dto.Content ?? "").Trim();
        if (string.IsNullOrEmpty(content))
            return BadRequest(new { error = "Conteúdo da nota é obrigatório." });

        Guid? requestId = dto.RequestId;
        if (requestId.HasValue && !requests.Any(r => r.Id == requestId.Value))
            return BadRequest(new { error = "RequestId não pertence ao prontuário do paciente." });

        // Phase C: sensibilidade + specialty do autor (CFP 001/2009 / Lei 10.216/2001).
        // Default "general" preserva comportamento para chamadas legadas que não mandam o campo.
        var sensitivityRaw = (dto.Sensitivity ?? "general").Trim().ToLowerInvariant();
        if (!ValidSensitivities.Contains(sensitivityRaw))
            return BadRequest(new { error = $"Sensibilidade inválida. Use: {string.Join(", ", ValidSensitivities)}" });
        var sensitivity = ParseSensitivityOrDefault(sensitivityRaw);

        var authorSpecialty = await GetViewerSpecialtyAsync(doctorId, cancellationToken);
        var summaryForTeam = string.IsNullOrWhiteSpace(dto.SummaryForTeam) ? null : dto.SummaryForTeam.Trim();

        // CFP 001/2009: notas author_only exigem resumo para a equipe (não pode ocultar tudo).
        if (sensitivity == RenoveJa.Domain.Enums.NoteSensitivity.AuthorOnly && string.IsNullOrWhiteSpace(summaryForTeam))
            return BadRequest(new { error = "summary_for_team é obrigatório para notas author_only" });

        var entity = await doctorPatientNotesRepository.AddNoteAsync(
            doctorId,
            authorSpecialty,
            patientId,
            noteType,
            content,
            sensitivity,
            summaryForTeam,
            requestId,
            cancellationToken);
        var note = MapNoteToDto(entity, doctorId);

        // LGPD Art. 11: conteúdo clínico (PII sensível) NÃO é persistido em audit_logs.
        // Apenas metadata não-sensível é registrada; o conteúdo real está na tabela própria de notas clínicas.
        var newValues = new Dictionary<string, object?>
        {
            ["note_type"] = entity.NoteType,
            ["content_length"] = entity.Content?.Length ?? 0,
            ["sensitivity"] = SerializeSensitivity(entity.Sensitivity),
            ["author_specialty"] = entity.AuthorSpecialty,
            ["request_id"] = entity.RequestId,
            ["patient_id"] = patientId,
            ["created_at"] = entity.CreatedAt
        };
        _ = auditService.LogModificationAsync(doctorId, "Create", "DoctorPatientNote", entity.Id, oldValues: null, newValues: newValues, cancellationToken: CancellationToken.None)
            .ContinueWith(t =>
            {
                if (t.IsFaulted)
                    logger.LogWarning(t.Exception, "Audit log failed for DoctorPatientNote creation by DoctorId={DoctorId}, NoteId={NoteId}", doctorId, entity.Id);
            }, TaskContinuationOptions.OnlyOnFaulted);
        _ = auditEventService.LogReadAsync(doctorId, "DoctorPatientNote", patientId, "api", HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken: CancellationToken.None)
            .ContinueWith(t =>
            {
                if (t.IsFaulted)
                    logger.LogWarning(t.Exception, "Audit log failed for DoctorPatientNote read by DoctorId={DoctorId}, PatientId={PatientId}", doctorId, patientId);
            }, TaskContinuationOptions.OnlyOnFaulted);
        return Ok(note);
    }

    /// <summary>
    /// Gera um token temporário (5 min) para download do PDF assinado.
    /// Evita expor o JWT completo na query string da URL de download.
    /// </summary>
    [HttpPost("{id}/document-token")]
    public async Task<IActionResult> CreateDocumentToken(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var req = await requestService.GetRequestByIdAsync(id, userId, cancellationToken);
        var isOwner = req.PatientId == userId || (req.DoctorId.HasValue && req.DoctorId.Value == userId);
        if (!isOwner)
            return StatusCode(403, new { error = "Você não tem permissão para acessar este documento." });

        var token = documentTokenService.GenerateDocumentToken(id, validMinutes: 5);
        if (string.IsNullOrEmpty(token))
            return StatusCode(500, new { error = "Não foi possível gerar token de download. Verifique configuração do servidor." });

        return Ok(new { token });
    }

    /// <summary>
    /// Baixa/visualiza o PDF assinado. Paciente ou médico atribuído.
    /// Aceita Bearer ou ?token= (temporário para links abertos em navegador).
    /// URL usa domínio próprio (renovejasaude.com.br) quando Api:BaseUrl configurado.
    /// </summary>
    [HttpGet("{id}/document")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDocument(Guid id, [FromQuery] string? token, CancellationToken cancellationToken)
    {
        byte[]? bytes;
        Guid? auditUserId = null;
        if (!string.IsNullOrWhiteSpace(token))
        {
            bytes = await requestService.GetSignedDocumentByTokenAsync(id, token, cancellationToken);
        }
        else
        {
            Guid userId;
            try
            {
                userId = GetUserId();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { error = "Token de autenticação inválido ou ausente." });
            }

            var req = await requestService.GetRequestByIdAsync(id, userId, cancellationToken);
            var isOwner = req.PatientId == userId
                          || (req.DoctorId.HasValue && req.DoctorId.Value == userId);
            if (!isOwner)
                return StatusCode(403, new { error = "Você não tem permissão para acessar este documento." });

            bytes = await requestService.GetSignedDocumentAsync(id, userId, cancellationToken);
            auditUserId = userId;
        }

        if (bytes == null || bytes.Length == 0)
            return NotFound(new { error = "Documento assinado não disponível ou você não tem permissão para acessá-lo." });
        _ = auditEventService.LogReadAsync(auditUserId, "SignedDocument", id, "api", HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken: CancellationToken.None)
            .ContinueWith(t =>
            {
                if (t.IsFaulted)
                    logger.LogWarning(t.Exception, "Audit log failed for SignedDocument read, DocumentId={DocumentId}", id);
            }, TaskContinuationOptions.OnlyOnFaulted);
        return File(bytes, "application/pdf", $"documento-{id}.pdf");
    }

    /// <summary>
    /// Proxy para imagens de receita. Bucket prescription-images é privado; este endpoint serve as imagens com autenticação.
    /// Aceita Bearer ou ?token= (para Image component que não envia headers).
    /// </summary>
    [HttpGet("{id}/prescription-image/{index:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPrescriptionImage(Guid id, int index, [FromQuery] string? token, CancellationToken cancellationToken)
    {
        Guid? userId = null;
        try { userId = GetUserId(); } catch { /* AllowAnonymous */ }

        if (userId == null && string.IsNullOrWhiteSpace(token))
            return Unauthorized(new { error = "Autenticação necessária para acessar imagens." });

        var bytes = await requestService.GetRequestImageAsync(id, token, userId, "prescription", index, cancellationToken);
        if (bytes == null || bytes.Length == 0)
            return NotFound(new { error = "Imagem não encontrada ou sem permissão." });
        var contentType = DetectContentType(bytes);
        return File(bytes, contentType, $"receita-{id}-{index}");
    }

    /// <summary>
    /// Proxy para imagens de exame. Bucket prescription-images é privado; este endpoint serve as imagens com autenticação.
    /// Aceita Bearer ou ?token= (para Image component que não envia headers).
    /// </summary>
    [HttpGet("{id}/exam-image/{index:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetExamImage(Guid id, int index, [FromQuery] string? token, CancellationToken cancellationToken)
    {
        Guid? userId = null;
        try { userId = GetUserId(); } catch { /* AllowAnonymous */ }

        if (userId == null && string.IsNullOrWhiteSpace(token))
            return Unauthorized(new { error = "Autenticação necessária para acessar imagens." });

        var bytes = await requestService.GetRequestImageAsync(id, token, userId, "exam", index, cancellationToken);
        if (bytes == null || bytes.Length == 0)
            return NotFound(new { error = "Imagem não encontrada ou sem permissão." });
        var contentType = DetectContentType(bytes);
        return File(bytes, contentType, $"exame-{id}-{index}");
    }

    /// <summary>
    /// Lista gravações da consulta (Daily). Paciente, médico da consulta ou admin.
    /// room_name = consult-{requestId:N} permite identificar qual gravação pertence a qual request.
    /// </summary>
    [HttpGet("{id}/recordings")]
    public async Task<IActionResult> GetRecordings(
        Guid id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var request = await requestRepository.GetByIdAsync(id, cancellationToken);
        if (request == null)
            return NotFound();

        var isPatient = request.PatientId == userId;
        var isDoctor = request.DoctorId.HasValue && request.DoctorId.Value == userId;
        var isAdmin = User.IsInRole("admin");

        if (!isPatient && !isDoctor && !isAdmin)
            return Forbid();

        var roomName = dailyConfig.Value.GetRoomName(id);
        var recordings = await dailyVideoService.ListRecordingsByRoomAsync(roomName, cancellationToken);

        return Ok(new { requestId = id, roomName, recordings });
    }

    /// <summary>
    /// Retorna signed URL para download do .txt da transcrição (bucket privado).
    /// Médico ou paciente da consulta. expiresIn: segundos (padrão 300, máximo 3600).
    /// </summary>
    [HttpGet("{id}/transcript-download-url")]
    public async Task<IActionResult> GetTranscriptDownloadUrl(
        Guid id,
        [FromQuery] int expiresIn = 300,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        // Cap em 1 h para reduzir janela de exposição de URL pré-assinada com dados clínicos.
        var clampedExpires = Math.Clamp(expiresIn, 60, 3600);
        var url = await requestService.GetTranscriptDownloadUrlAsync(id, userId, clampedExpires, cancellationToken);
        if (url == null)
            return NotFound(new { error = "Transcrição não encontrada ou sem permissão." });
        return Ok(new { signedUrl = url, expiresIn = clampedExpires });
    }

    /// <summary>
    /// Retorna signed URL para reprodução da gravação de vídeo da consulta (bucket privado).
    /// Médico ou paciente da consulta. expiresIn: segundos (padrão 3600).
    /// </summary>
    [HttpGet("{id}/recording-download-url")]
    public async Task<IActionResult> GetRecordingDownloadUrl(
        Guid id,
        [FromQuery] int expiresIn = 3600,
        CancellationToken cancellationToken = default)
    {
        var userId = GetUserId();
        var url = await requestService.GetRecordingDownloadUrlAsync(id, userId, Math.Clamp(expiresIn, 60, 86400), cancellationToken);
        if (url == null)
            return NotFound(new { error = "Gravação não encontrada ou sem permissão." });
        return Ok(new { signedUrl = url, expiresIn });
    }
}
