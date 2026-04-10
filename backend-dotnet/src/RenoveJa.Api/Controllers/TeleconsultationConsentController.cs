using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Api.Controllers;

[ApiController]
[Route("api/requests")]
[Authorize]
public class TeleconsultationConsentController(
    IUserRepository userRepository,
    IPatientRepository patientRepository,
    IConsentRepository consentRepository,
    IRequestRepository requestRepository,
    IAuditEventService auditEventService,
    ILogger<TeleconsultationConsentController> logger) : ControllerBase
{
    public record TeleconsultationConsentRequest(string? Channel);

    [HttpPost("{requestId:guid}/teleconsultation-consent")]
    [Authorize(Roles = "patient")]
    public async Task<IActionResult> CreateTeleconsultationConsent(
        Guid requestId,
        [FromBody] TeleconsultationConsentRequest? request,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { error = "Usuário não autenticado." });

        var user = await userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null)
            return NotFound(new { error = "Usuário não encontrado." });

        var patient = await patientRepository.GetByUserIdAsync(userId, cancellationToken);
        if (patient == null)
            return NotFound(new { error = "Paciente não encontrado." });

        // Bug fix: validar que o request existe e pertence a este paciente.
        // Sem esta checagem, um paciente autenticado podia registrar consent em qualquer requestId arbitrário.
        var medicalRequest = await requestRepository.GetByIdAsync(requestId, cancellationToken);
        if (medicalRequest == null)
            return NotFound(new { error = "Solicitação não encontrada." });
        if (medicalRequest.PatientId != userId)
        {
            logger.LogWarning(
                "Teleconsultation consent refused — patient {UserId} tried to consent for foreign request {RequestId}",
                userId, requestId);
            return StatusCode(403, new { error = "Acesso negado a esta solicitação." });
        }

        // Bug fix: consent só faz sentido para consultation em estado pré-consulta / em andamento.
        // Sem esta checagem, um paciente podia registrar "consent" em consultas canceladas ou já
        // encerradas — poluindo o audit trail LGPD/CFM com registros de consentimento para sessões
        // que nunca iriam (ou já não podiam) acontecer.
        if (medicalRequest.RequestType != RequestType.Consultation)
            return BadRequest(new { error = "Consentimento de teleconsulta só se aplica a consultas." });
        var allowedStatuses = medicalRequest.Status is RequestStatus.Submitted
            or RequestStatus.SearchingDoctor
            or RequestStatus.ConsultationReady
            or RequestStatus.Paid
            or RequestStatus.InConsultation;
        if (!allowedStatuses)
        {
            logger.LogWarning(
                "Teleconsultation consent refused — request {RequestId} status {Status} does not allow consent",
                requestId, medicalRequest.Status);
            return BadRequest(new { error = "Status da consulta não permite registrar consentimento." });
        }

        var channel = string.IsNullOrWhiteSpace(request?.Channel) ? "mobile" : request.Channel.Trim();

        var consent = ConsentRecord.Create(
            patientId: patient.Id,
            consentType: ConsentType.TelemedicineSession,
            legalBasis: LegalBasis.ExplicitConsent,
            purpose: "Consentimento livre e esclarecido para teleconsulta conforme Resolução CFM 2.314/2022",
            acceptedAt: DateTime.UtcNow,
            channel: channel,
            textVersion: "1.0");

        var saved = await consentRepository.CreateAsync(consent, cancellationToken);

        patient.LinkConsentRecord(saved.Id);
        await patientRepository.UpdateAsync(patient, cancellationToken);

        await auditEventService.LogWriteAsync(
            userId,
            action: "ConsentCreated",
            entityType: "ConsentRecord",
            entityId: saved.Id,
            channel: channel,
            cancellationToken: cancellationToken);

        logger.LogInformation(
            "Teleconsultation consent {ConsentId} created for patient {PatientId} on request {RequestId}",
            saved.Id, patient.Id, requestId);

        return Created($"api/requests/{requestId}/teleconsultation-consent/{saved.Id}", new
        {
            consentId = saved.Id,
            requestId,
            consentType = ConsentType.TelemedicineSession.ToString(),
            acceptedAt = saved.AcceptedAt,
            channel = saved.Channel
        });
    }
}
