using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.Interfaces;
using System.Security.Claims;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Assinatura em lote de documentos médicos.
/// Fluxo: Revisar → Aprovar → Acumular → Assinar todos.
/// </summary>
[ApiController]
[Route("api/batch-signature")]
[Authorize(Roles = "doctor")]
#pragma warning disable CS9113 // logger reserved for future logging
public class BatchSignatureController(
    IBatchSignatureService batchService,
    IOptions<BatchSignatureOptions> batchOptions,
    ILogger<BatchSignatureController> logger) : ControllerBase
#pragma warning restore CS9113
{
    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id : throw new UnauthorizedAccessException();

    /// <summary>Marca pedido como revisado.</summary>
    [HttpPost("{requestId}/review")]
    public async Task<IActionResult> MarkReviewed(Guid requestId, CancellationToken ct)
    {
        var ok = await batchService.MarkAsReviewedAsync(GetUserId(), requestId, ct);
        return ok ? Ok(new { reviewed = true }) : BadRequest(new { error = "Pedido não encontrado ou acesso negado." });
    }

    /// <summary>Aprova pedido para assinatura em lote.</summary>
    [HttpPost("{requestId}/approve-for-signing")]
    public async Task<IActionResult> ApproveForSigning(Guid requestId, CancellationToken ct)
    {
        var (success, error) = await batchService.ApproveForSigningAsync(GetUserId(), requestId, ct);
        return success ? Ok(new { approved = true }) : BadRequest(new { error });
    }

    /// <summary>Marca como revisado e aprova em uma única chamada (conveniência).</summary>
    [HttpPost("{requestId}/review-and-approve")]
    public async Task<IActionResult> ReviewAndApprove(Guid requestId, CancellationToken ct)
    {
        var (success, error) = await batchService.ReviewAndApproveAsync(GetUserId(), requestId, ct);
        return success ? Ok(new { reviewed = true, approved = true }) : BadRequest(new { error });
    }

    /// <summary>Lista todos os requests aprovados para assinatura.</summary>
    /// <remarks>
    /// Retorna um array nu de GUIDs (List&lt;Guid&gt;) — o cliente mobile em
    /// `frontend-mobile/lib/api-batch-signature.ts` espera `Promise&lt;string[]&gt;`.
    /// NÃO envolver em objeto — isso quebra o contrato.
    /// </remarks>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending(CancellationToken ct)
    {
        var ids = await batchService.GetApprovedRequestIdsAsync(GetUserId(), ct);
        return Ok(ids);
    }

    /// <summary>Assina em lote todos os requests aprovados.</summary>
    [HttpPost("sign")]
    public async Task<IActionResult> SignBatch(
        [FromBody] BatchSignRequest? request, CancellationToken ct)
    {
        // BUG FIX: body ausente causava NullReferenceException em request.RequestIds.
        if (request == null)
            return BadRequest(new { error = "Body da requisição é obrigatório." });
        if (request.RequestIds == null || request.RequestIds.Count == 0)
            return BadRequest(new { error = "Nenhum pedido selecionado." });
        if (string.IsNullOrWhiteSpace(request.PfxPassword))
            return BadRequest(new { error = "Senha do certificado digital é obrigatória." });

        // BUG FIX: deduplicação — cliente podia enviar mesmo id várias vezes,
        // causando tentativas duplicadas de assinatura no mesmo documento.
        var distinctIds = request.RequestIds
            .Where(g => g != Guid.Empty)
            .Distinct()
            .ToList();
        if (distinctIds.Count == 0)
            return BadRequest(new { error = "Nenhum pedido válido selecionado." });

        var maxBatchSize = batchOptions.Value.MaxItemsPerBatch;
        if (distinctIds.Count > maxBatchSize)
            return BadRequest(new { error = $"Lote excede o limite máximo de {maxBatchSize} itens. Recebido: {distinctIds.Count}." });

        var result = await batchService.SignBatchAsync(
            GetUserId(), distinctIds, request.PfxPassword, ct);

        return Ok(result);
    }
}

public record BatchSignRequest(List<Guid> RequestIds, string? PfxPassword);
