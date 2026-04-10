using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RenoveJa.Domain.ValueObjects;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Busca CID-10 (ICD) para autocomplete e validação no frontend.
/// Usa base local (Cid10Database) com ~220 códigos mais frequentes em atenção primária.
/// </summary>
[ApiController]
[Route("api/cid10")]
[Authorize]
public class Cid10Controller : ControllerBase
{
    /// <summary>
    /// Busca códigos CID-10 por termo (código ou descrição).
    /// Ex: GET /api/cid10/search?q=diabetes&amp;limit=10
    /// </summary>
    [HttpGet("search")]
    public IActionResult Search([FromQuery] string? q, [FromQuery] int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(Array.Empty<object>());

        // Clamp evita limit <= 0 ou absurdamente grande (DoS leve).
        var safeLimit = Math.Clamp(limit, 1, 20);
        var results = Cid10Database.Search(q.Trim(), safeLimit);
        return Ok(results.Select(r => new { r.Code, r.Description }));
    }
}
