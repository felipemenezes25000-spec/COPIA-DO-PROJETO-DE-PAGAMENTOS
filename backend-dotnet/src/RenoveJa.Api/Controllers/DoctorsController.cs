using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using RenoveJa.Application.DTOs.Doctors;
using RenoveJa.Application.Interfaces;
using RenoveJa.Application.Services.Doctors;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Controller responsável por listagem e gestão de médicos.
/// </summary>
[ApiController]
[Route("api/doctors")]
public class DoctorsController(
    IDoctorService doctorService,
    ICrmValidationService crmValidationService,
    IMemoryCache cache,
    ILogger<DoctorsController> logger) : ControllerBase
{
    // Only digits (up to 7) allowed for CRM; UF is 2 letters.
    private static readonly Regex CrmRegex = new("^[0-9]{4,7}$", RegexOptions.Compiled);
    private static readonly Regex UfRegex = new("^[A-Z]{2}$", RegexOptions.Compiled);

    private static Guid GetUserId(ClaimsPrincipal user)
    {
        var claim = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }
    /// <summary>
    /// Lista médicos com paginação, opcionalmente por especialidade e disponibilidade.
    /// Intentionally public (AllowAnonymous) — patients search for available doctors before authenticating.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting("fixed")]
    public async Task<IActionResult> GetDoctors(
        [FromQuery] string? specialty,
        [FromQuery] bool? available,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        if (page < 1) page = 1;
        // Input validation: bound specialty filter length to avoid abusive queries.
        if (!string.IsNullOrEmpty(specialty))
        {
            specialty = specialty.Trim();
            if (specialty.Length > 100)
                return BadRequest(new { error = "Filtro 'specialty' inválido." });
        }
        logger.LogInformation("Doctors GetDoctors: specialty={Specialty}, available={Available}, page={Page}", specialty, available, page);
        var doctors = await doctorService.GetDoctorsPagedAsync(specialty, available, page, pageSize, cancellationToken);
        return Ok(doctors);
    }

    /// <summary>
    /// Obtém um médico pelo ID.
    /// </summary>
    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetDoctor(
        Guid id,
        CancellationToken cancellationToken)
    {
        var doctor = await doctorService.GetDoctorByIdAsync(id, cancellationToken);
        if (doctor == null)
            return NotFound();
        return Ok(doctor);
    }

    /// <summary>
    /// Retorna a fila de médicos disponíveis (para role doctor).
    /// </summary>
    [HttpGet("queue")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> GetQueue(
        [FromQuery] string? specialty,
        CancellationToken cancellationToken)
    {
        var doctors = await doctorService.GetQueueAsync(specialty, cancellationToken);
        return Ok(doctors);
    }

    /// <summary>
    /// Atualiza a disponibilidade de um médico.
    /// </summary>
    [HttpPut("{id}/availability")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> UpdateAvailability(
        Guid id,
        [FromBody] UpdateDoctorAvailabilityDto dto,
        CancellationToken cancellationToken)
    {
        // FIX B23: IDOR guard — verify the doctor profile belongs to the current user
        var currentUserId = GetUserId(User);
        if (currentUserId == Guid.Empty)
            return Unauthorized();
        var existingProfile = await doctorService.GetProfileByUserIdAsync(currentUserId, cancellationToken);
        if (existingProfile == null)
            return NotFound();
        if (existingProfile.Id != id)
            return Forbid();

        var profile = await doctorService.UpdateAvailabilityAsync(id, dto, cancellationToken);
        return Ok(profile);
    }

    /// <summary>
    /// Retorna o perfil do médico logado.
    /// </summary>
    [HttpGet("me")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
    {
        var userId = GetUserId(User);
        if (userId == Guid.Empty)
            return Unauthorized();
        var profile = await doctorService.GetProfileByUserIdAsync(userId, cancellationToken);
        if (profile == null)
            return NotFound();
        return Ok(profile);
    }

    /// <summary>
    /// Atualiza endereço e telefone profissional do médico logado. Obrigatório para assinar receitas.
    /// </summary>
    [HttpPatch("me/profile")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> UpdateMyProfile(
        [FromBody] UpdateDoctorProfileDto dto,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId(User);
        if (userId == Guid.Empty)
            return Unauthorized();
        var profile = await doctorService.UpdateProfileByUserIdAsync(userId, dto, cancellationToken);
        return Ok(profile);
    }

    /// <summary>
    /// Valida um CRM consultando o CFM via InfoSimples API.
    /// Body: { "crm": "123456", "uf": "SP" }
    /// </summary>
    [Authorize]
    [HttpPost("validate-crm")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ValidateCrm(
        [FromBody] ValidateCrmRequestDto dto,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Crm) || string.IsNullOrWhiteSpace(dto.Uf))
            return BadRequest(new { error = "CRM e UF são obrigatórios." });

        // Normalize inputs (strip non-digits from CRM, uppercase UF) and validate format.
        var normalizedCrm = new string((dto.Crm ?? string.Empty).Where(char.IsDigit).ToArray());
        var normalizedUf = (dto.Uf ?? string.Empty).Trim().ToUpperInvariant();
        if (!CrmRegex.IsMatch(normalizedCrm))
            return BadRequest(new { error = "CRM inválido. Informe apenas números (4 a 7 dígitos)." });
        if (!UfRegex.IsMatch(normalizedUf))
            return BadRequest(new { error = "UF inválida. Informe a sigla do estado com 2 letras." });

        // Cache positive results per (CRM+UF) to reduce load on external provider (InfoSimples).
        var cacheKey = $"crm:{normalizedCrm}:{normalizedUf}";
        var result = await cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            var fetched = await crmValidationService.ValidateCrmAsync(normalizedCrm, normalizedUf, cancellationToken);
            // Cache válido por 24h; inválido por 10min para evitar flooding com CRMs errados.
            entry.AbsoluteExpirationRelativeToNow = fetched?.IsValid == true
                ? TimeSpan.FromHours(24)
                : TimeSpan.FromMinutes(10);
            return fetched;
        });

        if (result == null)
            return StatusCode(502, new { error = "Serviço de validação de CRM indisponível. Tente novamente." });

        // CFM cross-validation: avisa se especialidade declarada difere da registrada no CFM
        string? specialtyMismatchWarning = null;
        if (result.IsValid
            && !string.IsNullOrWhiteSpace(dto.DeclaredSpecialty)
            && !string.IsNullOrWhiteSpace(result.Specialty)
            && !result.Specialty.Contains(dto.DeclaredSpecialty, StringComparison.OrdinalIgnoreCase)
            && !dto.DeclaredSpecialty.Contains(result.Specialty, StringComparison.OrdinalIgnoreCase))
        {
            specialtyMismatchWarning = $"Especialidade declarada ({dto.DeclaredSpecialty}) difere da registrada no CFM ({result.Specialty}). Verifique o RQE.";
        }

        return Ok(new
        {
            valid = result.IsValid,
            doctorName = result.DoctorName,
            crm = result.Crm,
            uf = result.Uf,
            specialty = result.Specialty,
            situation = result.Situation,
            error = result.ErrorMessage,
            specialtyMismatchWarning
        });
    }
}

/// <summary>
/// DTO para validação de CRM.
/// </summary>
public record ValidateCrmRequestDto(string Crm, string Uf, string? DeclaredSpecialty = null);
