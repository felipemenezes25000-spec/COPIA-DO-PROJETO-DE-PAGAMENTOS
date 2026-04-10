using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RenoveJa.Application.DTOs.Requests;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Interfaces;
using System.Security.Claims;

namespace RenoveJa.Api.Controllers;

[ApiController]
[Route("api/requests")]
[Authorize]
#pragma warning disable CS9113 // logger reserved for future logging
public class RequestApprovalController(
    IRequestService requestService,
    IRequestRepository requestRepository,
    ILogger<RequestApprovalController> logger) : ControllerBase
#pragma warning restore CS9113
{
    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID");
        return userId;
    }

    private async Task<Guid?> ResolveRequestIdAsync(string id, CancellationToken cancellationToken)
    {
        if (Guid.TryParse(id, out var guid))
            return guid;
        var req = await requestRepository.GetByShortCodeAsync(id, cancellationToken);
        return req?.Id;
    }

    /// <summary>
    /// Atualiza o status de uma solicitação (médico). Somente o médico atribuído.
    /// </summary>
    [HttpPut("{id}/status")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateRequestStatusDto? dto,
        CancellationToken cancellationToken)
    {
        // BUG FIX: body ausente causava NullReferenceException na camada service.
        if (dto == null || string.IsNullOrWhiteSpace(dto.Status))
            return BadRequest(new { error = "Campo 'status' é obrigatório." });

        var doctorId = GetUserId();
        var request = await requestService.UpdateStatusAsync(id, dto, doctorId, cancellationToken);
        return Ok(request);
    }

    /// <summary>
    /// Aprova a renovação. Somente médicos (role doctor). Body vazio.
    /// Sem fluxo de pagamento.
    /// Para rejeitar: POST /api/requests/{id}/reject com { "rejectionReason": "motivo" }.
    /// </summary>
    [HttpPost("{id}/approve")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> Approve(
        string id,
        [FromBody] ApproveRequestDto? dto,
        CancellationToken cancellationToken)
    {
        var resolvedId = await ResolveRequestIdAsync(id, cancellationToken);
        if (resolvedId == null) return NotFound();
        var doctorId = GetUserId();
        var request = await requestService.ApproveAsync(resolvedId.Value, dto ?? new ApproveRequestDto(), doctorId, cancellationToken);
        return Ok(request);
    }

    /// <summary>
    /// Rejeita uma solicitação com motivo (médico). Somente o médico atribuído.
    /// </summary>
    [HttpPost("{id}/reject")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> Reject(
        string id,
        [FromBody] RejectRequestDto? dto,
        CancellationToken cancellationToken)
    {
        // BUG FIX: exigir motivo de rejeição (regulatorio/auditoria).
        if (dto == null || string.IsNullOrWhiteSpace(dto.RejectionReason))
            return BadRequest(new { error = "Campo 'rejectionReason' é obrigatório." });
        if (dto.RejectionReason.Length > 2000)
            return BadRequest(new { error = "Motivo da rejeição excede 2000 caracteres." });

        var resolvedId = await ResolveRequestIdAsync(id, cancellationToken);
        if (resolvedId == null) return NotFound();
        var doctorId = GetUserId();
        var request = await requestService.RejectAsync(resolvedId.Value, dto, doctorId, cancellationToken);
        return Ok(request);
    }

    /// <summary>
    /// Atribui a solicitação à fila (próximo médico disponível).
    /// Aceita UUID ou short_code.
    /// </summary>
    [HttpPost("{id}/assign-queue")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> AssignQueue(
        string id,
        CancellationToken cancellationToken)
    {
        var resolvedId = await ResolveRequestIdAsync(id, cancellationToken);
        if (resolvedId == null) return NotFound(new { message = "Solicitação não encontrada", code = "request_not_found" });
        var request = await requestService.AssignToQueueAsync(resolvedId.Value, cancellationToken);
        return Ok(request);
    }

    [HttpPut("{id}/conduct")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> UpdateConduct(
        string id,
        [FromBody] UpdateConductDto? dto,
        CancellationToken cancellationToken)
    {
        // BUG FIX: null body → NullReferenceException no service.
        if (dto == null)
            return BadRequest(new { error = "Body da requisição é obrigatório." });

        var resolvedId = await ResolveRequestIdAsync(id, cancellationToken);
        if (resolvedId == null) return NotFound();
        var doctorId = GetUserId();
        var result = await requestService.UpdateConductAsync(resolvedId.Value, dto, doctorId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Paciente marca o documento como entregue (Signed → Delivered) ao baixar/abrir o PDF.
    /// </summary>
    [HttpPost("{id}/mark-delivered")]
    public async Task<IActionResult> MarkDelivered(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var request = await requestService.MarkDeliveredAsync(id, userId, cancellationToken);
        return Ok(request);
    }

    /// <summary>
    /// Paciente cancela o pedido (apenas antes do pagamento).
    /// </summary>
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var request = await requestService.CancelAsync(id, userId, cancellationToken);
        return Ok(request);
    }

    /// <summary>
    /// Lista pedidos rejeitados pela IA para o médico autenticado, filtrados pela especialidade do médico.
    /// </summary>
    [HttpGet("ai-rejected")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> ListAiRejected(
        [FromServices] IRequestQueryService queryService,
        CancellationToken cancellationToken)
    {
        var doctorId = GetUserId();
        var items = await queryService.ListAiRejectedAsync(doctorId, cancellationToken);
        return Ok(items);
    }

    /// <summary>
    /// Médico reabre um pedido rejeitado pela IA para revisão manual.
    /// </summary>
    [HttpPost("{id}/reopen-ai-rejection")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> ReopenAiRejection(
        string id,
        [FromServices] IRequestApprovalService approvalService,
        CancellationToken cancellationToken)
    {
        var resolvedId = await ResolveRequestIdAsync(id, cancellationToken);
        if (resolvedId == null) return NotFound();
        var doctorId = GetUserId();
        var request = await approvalService.ReopenFromAiRejectionAsync(resolvedId.Value, doctorId, cancellationToken);
        return Ok(request);
    }
}
