using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RenoveJa.Application.DTOs.Productivity;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// CRUD de contrato por médico — opcional. Quando presente, permite ao portal
/// RH calcular <c>UtilizationRate</c> (horas ativas / horas contratadas) e
/// <c>IdleCostCents</c> (horas ociosas × valor/hora).
/// Médicos sem contrato aparecem no dashboard sem esses dois campos.
/// </summary>
[ApiController]
[Route("api/admin/contracts")]
[Authorize(Roles = "admin")]
[EnableRateLimiting("admin")]
public class AdminContractsController(
    IDoctorContractRepository repository,
    ILogger<AdminContractsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DoctorContractDto>>> GetAllActive(CancellationToken ct)
    {
        var items = await repository.GetAllActiveAsync(ct);
        return Ok(items);
    }

    [HttpGet("doctors/{doctorProfileId:guid}")]
    public async Task<ActionResult<DoctorContractDto>> GetByDoctor(
        Guid doctorProfileId, CancellationToken ct)
    {
        var item = await repository.GetActiveByDoctorAsync(doctorProfileId, ct);
        if (item is null)
            return NotFound(new { error = "Contrato ativo não encontrado para este médico." });
        return Ok(item);
    }

    [HttpPut("doctors/{doctorProfileId:guid}")]
    public async Task<ActionResult<DoctorContractDto>> Upsert(
        Guid doctorProfileId,
        [FromBody] UpsertDoctorContractDto dto,
        CancellationToken ct)
    {
        if (dto is null)
            return BadRequest(new { error = "Corpo da requisição é obrigatório." });
        if (dto.HoursPerMonth < 0 || dto.HoursPerMonth > 10_000)
            return BadRequest(new { error = "HoursPerMonth fora do intervalo aceitável (0–10000)." });
        if (dto.HourlyRateCents < 0)
            return BadRequest(new { error = "HourlyRateCents não pode ser negativo." });
        if (dto.EndsAt.HasValue && dto.EndsAt.Value.Date < dto.StartsAt.Date)
            return BadRequest(new { error = "EndsAt deve ser posterior a StartsAt." });

        var result = await repository.UpsertAsync(doctorProfileId, dto, GetUserId(), ct);
        logger.LogInformation(
            "Contract upserted for doctor {DoctorProfileId}: {Hours}h @ {Rate}¢/h",
            doctorProfileId, dto.HoursPerMonth, dto.HourlyRateCents);
        return Ok(result);
    }

    [HttpDelete("doctors/{doctorProfileId:guid}")]
    public async Task<IActionResult> Deactivate(Guid doctorProfileId, CancellationToken ct)
    {
        var ok = await repository.DeactivateAsync(doctorProfileId, GetUserId(), ct);
        if (!ok)
            return NotFound(new { error = "Nenhum contrato ativo para desativar." });
        logger.LogInformation("Contract deactivated for doctor {DoctorProfileId}", doctorProfileId);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
