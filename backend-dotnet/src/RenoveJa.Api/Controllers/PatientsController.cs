using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Api.Controllers;

[ApiController]
[Route("api/patients")]
[Authorize]
public class PatientsController(
    IUserRepository userRepository,
    IRequestRepository requestRepository,
    IConsentRepository consentRepository,
    IAuditLogRepository auditLogRepository,
    IAuditService auditService) : ControllerBase
{
    [HttpGet("me/export")]
    [EnableRateLimiting("export")]
    public async Task<IActionResult> ExportMyData(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { error = "Usuário não autenticado." });

        var user = await userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null)
            return NotFound(new { error = "Paciente não encontrado." });

        var requests = await requestRepository.GetByPatientIdAsync(userId, cancellationToken);
        var consents = await consentRepository.GetByPatientIdAsync(userId, cancellationToken);
        var auditLogs = await auditLogRepository.GetByUserIdAsync(userId, limit: 1000, offset: 0, cancellationToken);

        await auditService.LogAsync(
            userId,
            "Export",
            "PatientDataExport",
            userId,
            metadata: new Dictionary<string, object?>
            {
                ["requests_count"] = requests.Count,
                ["consents_count"] = consents.Count,
                ["audit_count"] = auditLogs.Count
            });

        var payload = new
        {
            exportedAt = DateTime.UtcNow,
            patient = new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Phone,
                user.Cpf,
                user.Role,
                user.CreatedAt,
                user.UpdatedAt
            },
            requests = requests.Select(r => new
            {
                r.Id,
                r.RequestType,
                r.Status,
                r.PrescriptionType,
                r.PrescriptionKind,
                r.Medications,
                r.Exams,
                r.Symptoms,
                r.SignedDocumentUrl,
                r.SignedAt,
                r.CreatedAt,
                r.UpdatedAt
            }),
            consents = consents.Select(c => new
            {
                c.Id,
                c.ConsentType,
                c.LegalBasis,
                c.Purpose,
                c.AcceptedAt,
                c.Channel,
                c.TextVersion,
                c.CreatedAt
            }),
            auditLogs = auditLogs.Select(a => new
            {
                a.Id,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.CorrelationId,
                a.Metadata,
                a.CreatedAt
            })
        };

        return Ok(payload);
    }
}
