using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RenoveJa.Application.DTOs.Productivity;
using RenoveJa.Application.Interfaces;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// CRUD da tabela de preços por tipo de atendimento. A tabela é pequena
/// (~10 linhas) e editada exclusivamente pelo admin no portal RH.
/// Cada registro define quanto o contratante paga pelo resultado produzido
/// (receita, exame, consulta) e alimenta o cálculo de "receita gerada por
/// médico" no dashboard de produtividade.
/// </summary>
[ApiController]
[Route("api/admin/pricing")]
[Authorize(Roles = "admin")]
[EnableRateLimiting("admin")]
public class AdminPricingController(
    IProductPriceRepository repository,
    ILogger<AdminPricingController> logger) : ControllerBase
{
    [HttpGet("products")]
    public async Task<ActionResult<IReadOnlyList<ProductPriceDto>>> GetAllProducts(
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var list = includeInactive
            ? await repository.GetAllAsync(ct)
            : await repository.GetAllActiveAsync(ct);
        return Ok(list);
    }

    [HttpGet("products/{productKey}")]
    public async Task<ActionResult<ProductPriceDto>> GetProduct(string productKey, CancellationToken ct)
    {
        var item = await repository.GetByKeyAsync(productKey, ct);
        if (item is null)
            return NotFound(new { error = $"Produto '{productKey}' não encontrado." });
        return Ok(item);
    }

    [HttpPut("products/{productKey}")]
    public async Task<ActionResult<ProductPriceDto>> UpdateProduct(
        string productKey,
        [FromBody] UpsertProductPriceDto dto,
        CancellationToken ct)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.Label))
            return BadRequest(new { error = "Label é obrigatório." });
        if (dto.Unit != "unit" && dto.Unit != "minute")
            return BadRequest(new { error = "Unit deve ser 'unit' ou 'minute'." });
        if (dto.PriceCents < 0)
            return BadRequest(new { error = "PriceCents não pode ser negativo." });

        try
        {
            var updated = await repository.UpsertAsync(productKey, dto, GetUserId(), ct);
            logger.LogInformation("Price updated: {Key} = {Cents} cents by {User}",
                productKey, dto.PriceCents, GetUserId());
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("products")]
    public async Task<ActionResult<ProductPriceDto>> CreateCustom(
        [FromBody] CreateCustomProductDto dto,
        CancellationToken ct)
    {
        if (dto is null
            || string.IsNullOrWhiteSpace(dto.ProductKey)
            || string.IsNullOrWhiteSpace(dto.Label))
        {
            return BadRequest(new { error = "ProductKey e Label são obrigatórios." });
        }
        if (dto.Unit != "unit" && dto.Unit != "minute")
            return BadRequest(new { error = "Unit deve ser 'unit' ou 'minute'." });
        if (dto.PriceCents < 0)
            return BadRequest(new { error = "PriceCents não pode ser negativo." });

        var created = await repository.CreateCustomAsync(dto, GetUserId(), ct);
        logger.LogInformation("Custom price created: {Key} = {Cents} cents", dto.ProductKey, dto.PriceCents);
        return Created($"/api/admin/pricing/products/{dto.ProductKey}", created);
    }

    [HttpDelete("products/{productKey}")]
    public async Task<IActionResult> DeactivateProduct(string productKey, CancellationToken ct)
    {
        var ok = await repository.DeactivateAsync(productKey, GetUserId(), ct);
        if (!ok)
            return NotFound(new { error = $"Produto '{productKey}' não encontrado ou já inativo." });
        logger.LogInformation("Price deactivated: {Key} by {User}", productKey, GetUserId());
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
