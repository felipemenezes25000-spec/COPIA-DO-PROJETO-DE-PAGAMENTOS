using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RenoveJa.Application.Services;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Encurtador de URL para receitas — estilo Docway (re.mevosaude.com.br/XXX).
/// GET /r/{shortCode} redireciona para /api/verify/{id}?type=prescricao.
/// O shortCode é o GUID codificado em Base64Url (22 caracteres).
/// </summary>
[ApiController]
[Route("r")]
[AllowAnonymous]
public class ShortUrlController(ILogger<ShortUrlController> logger) : ControllerBase
{
    // Allowlist para o parâmetro `type` — evita reflexão de valores arbitrários
    // na query string do endpoint de verify (defesa contra injeção/enumeração).
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "prescricao",
        "exame",
        "atestado",
        "laudo",
        "relatorio"
    };

    /// <summary>
    /// Redireciona /r/{shortCode} para /api/verify/{id}?type=prescricao.
    /// O validador ITI e browsers seguem o redirect normalmente.
    /// </summary>
    [HttpGet("{shortCode}")]
    public IActionResult RedirectToVerify(
        [FromRoute] string shortCode,
        [FromQuery] string? type)
    {
        if (string.IsNullOrWhiteSpace(shortCode))
            return BadRequest();

        // BUG FIX: limitar tamanho para impedir DoS via decodificação de strings gigantes.
        if (shortCode.Length > 64)
            return NotFound(new { error = "Link inválido." });

        var id = ShortUrlEncoder.Decode(shortCode.Trim());
        if (id == null)
        {
            // Log para detecção de enumeração/brute force (sem expor detalhes ao cliente).
            logger.LogInformation("ShortUrl miss: code={CodeLen}", shortCode.Length);
            return NotFound(new { error = "Link inválido ou expirado." });
        }

        // BUG FIX: validar `type` contra allowlist — antes qualquer string era refletida
        // na URL de redirect, permitindo abuso (ex.: links para endpoints desconhecidos).
        var typeParam = !string.IsNullOrWhiteSpace(type) && AllowedTypes.Contains(type)
            ? type.ToLowerInvariant()
            : "prescricao";

        var verifyPath = $"/api/verify/{id}?type={Uri.EscapeDataString(typeParam)}";
        return Redirect(verifyPath);
    }
}
