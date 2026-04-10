using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RenoveJa.Application.DTOs.Auth;
using RenoveJa.Application.Interfaces;
using RenoveJa.Api.Authentication;
using RenoveJa.Api.Helpers;
using RenoveJa.Domain.Interfaces;
using System.Security.Claims;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Controller responsável por autenticação, registro e login de usuários e médicos.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(
    IAuthService authService,
    IPushTokenRepository pushTokenRepository,
    IValidator<RegisterRequestDto> registerValidator,
    IValidator<RegisterDoctorRequestDto> registerDoctorValidator,
    IValidator<HrDoctorOnboardingRequestDto> hrDoctorValidator,
    IValidator<CompleteProfileRequestDto> completeProfileValidator,
    IValidator<LoginRequestDto> loginValidator,
    IDoctorRepository doctorRepository,
    IStorageService storageService,
    ILogger<AuthController> logger) : ControllerBase
{
    /// <summary>
    /// Token lifetime in days — must match AuthToken.Create(expirationDays: 30).
    /// </summary>
    private const int TokenLifetimeDays = 30;

    /// <summary>
    /// Sets the auth_token HttpOnly cookie on the response.
    /// The cookie is HttpOnly + Secure + SameSite=Lax, scoped to /api.
    /// SameSite=Lax (not Strict) to allow navigation from external links (e.g. email password reset).
    /// The token is ALSO returned in the response body for backward compatibility with the mobile app.
    /// </summary>
    private void SetAuthCookie(string token)
    {
        Response.Cookies.Append(BearerAuthenticationHandler.AuthCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/api",
            MaxAge = TimeSpan.FromDays(TokenLifetimeDays),
        });
    }

    /// <summary>
    /// Clears the auth_token cookie (used on logout).
    /// </summary>
    private void ClearAuthCookie()
    {
        Response.Cookies.Delete(BearerAuthenticationHandler.AuthCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/api",
        });
    }
    /// <summary>
    /// Registra um novo paciente na plataforma.
    /// </summary>
    [HttpPost("register")]
    [EnableRateLimiting("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(
        [FromBody] RegisterRequestDto request,
        CancellationToken cancellationToken)
    {
        var validationResult = await registerValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            throw new ValidationException(validationResult.Errors);

        try
        {
            var response = await authService.RegisterAsync(request, cancellationToken);
            if (!string.IsNullOrEmpty(response.Token))
                SetAuthCookie(response.Token);
            return Ok(response);
        }
        catch (Exception e)
        {
            logger.LogError(e, "Auth Register falhou");
            throw;
        }
    }

    /// <summary>
    /// Registra um novo médico na plataforma.
    /// </summary>
    [EnableRateLimiting("register")]
    [HttpPost("register-doctor")]
    public async Task<ActionResult<AuthResponseDto>> RegisterDoctor(
        [FromBody] RegisterDoctorRequestDto request,
        CancellationToken cancellationToken)
    {
        var validationResult = await registerDoctorValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            throw new ValidationException(validationResult.Errors);

        var response = await authService.RegisterDoctorAsync(request, cancellationToken);
        if (!string.IsNullOrEmpty(response.Token))
            SetAuthCookie(response.Token);
        return Ok(response);
    }

    /// <summary>
    /// Onboarding de médico a partir do módulo RH Renoveja (payload em PT-BR).
    /// Gera senha temporária e dispara e-mail de definição de senha automaticamente.
    /// O médico fica pendente de aprovação até completar o endereço profissional
    /// (requisito da assinatura PAdES ICP-Brasil).
    /// </summary>
    [EnableRateLimiting("register")]
    [HttpPost("/api/doctors/from-hr")]
    public async Task<ActionResult<HrDoctorOnboardingResponseDto>> RegisterDoctorFromHr(
        [FromBody] HrDoctorOnboardingRequestDto request,
        CancellationToken cancellationToken)
    {
        var validationResult = await hrDoctorValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            throw new ValidationException(validationResult.Errors);

        var response = await authService.RegisterDoctorFromHrAsync(request, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Anexa currículo e/ou diploma (PDF) ao perfil de médico recém-criado pelo
    /// endpoint <c>/api/doctors/from-hr</c>. É um segundo passo do onboarding do RH:
    /// o frontend envia o JSON primeiro (para não bloquear a criação se o upload
    /// falhar) e, em seguida, anexa os arquivos usando o <paramref name="userId"/>
    /// devolvido na primeira resposta.
    ///
    /// Não exige autenticação (o médico ainda não definiu senha). Segurança:
    ///   - Rate limit "register" por IP evita abuso;
    ///   - O médico deve estar em approval_status='pending' — uploads em perfis
    ///     já aprovados são rejeitados para evitar substituição de documentos
    ///     sem revisão do admin;
    ///   - Apenas PDF é aceito, máximo 10 MB por arquivo;
    ///   - Path S3 é determinístico (documentos/medicos/{userId}/…) — um segundo
    ///     upload sobrescreve o anterior dentro da janela pending.
    /// </summary>
    [EnableRateLimiting("register")]
    [HttpPost("/api/doctors/from-hr/{userId:guid}/documents")]
    [RequestSizeLimit(25 * 1024 * 1024)] // 25 MB total (10 MB curriculo + 10 MB diploma + headers)
    public async Task<IActionResult> UploadHrDoctorDocuments(
        Guid userId,
        IFormFile? curriculo,
        IFormFile? diploma,
        CancellationToken cancellationToken)
    {
        if (curriculo == null && diploma == null)
            return BadRequest(new { message = "Envie pelo menos um arquivo (curriculo ou diploma)." });

        // 1. Valida identidade e estado do médico
        var profile = await doctorRepository.GetByUserIdAsync(userId, cancellationToken);
        if (profile == null)
            return NotFound(new { message = "Médico não encontrado." });

        if (profile.ApprovalStatus != Domain.Enums.DoctorApprovalStatus.Pending)
        {
            logger.LogWarning(
                "[HR Upload] Bloqueando upload de documentos para médico {UserId} em status {Status}",
                userId, profile.ApprovalStatus);
            return Conflict(new
            {
                message = "Upload de documentos só é permitido enquanto o cadastro está pendente de aprovação."
            });
        }

        // 2. Valida cada arquivo recebido
        const long MaxFileBytes = 10 * 1024 * 1024;
        if (curriculo != null && !IsValidPdf(curriculo, MaxFileBytes, out var curriculoError))
            return BadRequest(new { message = $"Currículo inválido: {curriculoError}" });
        if (diploma != null && !IsValidPdf(diploma, MaxFileBytes, out var diplomaError))
            return BadRequest(new { message = $"Diploma inválido: {diplomaError}" });

        // 3. Upload para S3 (bucket prescriptions via prefix "documentos/")
        string? curriculoUrl = null;
        string? diplomaUrl = null;
        var basePath = $"documentos/medicos/{userId:N}";

        if (curriculo != null)
        {
            await using var stream = curriculo.OpenReadStream();
            var result = await storageService.UploadStreamAsync(
                $"{basePath}/curriculo.pdf", stream, "application/pdf", cancellationToken);
            if (!result.Success || string.IsNullOrWhiteSpace(result.Url))
            {
                logger.LogError("[HR Upload] Falha ao fazer upload do currículo: {Error}", result.ErrorMessage);
                return StatusCode(502, new { message = "Falha ao armazenar currículo. Tente novamente." });
            }
            curriculoUrl = result.Url;
        }

        if (diploma != null)
        {
            await using var stream = diploma.OpenReadStream();
            var result = await storageService.UploadStreamAsync(
                $"{basePath}/diploma.pdf", stream, "application/pdf", cancellationToken);
            if (!result.Success || string.IsNullOrWhiteSpace(result.Url))
            {
                logger.LogError("[HR Upload] Falha ao fazer upload do diploma: {Error}", result.ErrorMessage);
                return StatusCode(502, new { message = "Falha ao armazenar diploma. Tente novamente." });
            }
            diplomaUrl = result.Url;
        }

        // 4. Persiste URLs no perfil
        profile.AttachDocuments(curriculoUrl, diplomaUrl);
        await doctorRepository.UpdateAsync(profile, cancellationToken);

        return Ok(new
        {
            userId,
            curriculumUrl = profile.CurriculumUrl,
            diplomaUrl = profile.DiplomaUrl,
            message = "Documentos anexados com sucesso."
        });
    }

    /// <summary>
    /// Validação simples: extensão .pdf, content-type application/pdf e magic bytes "%PDF".
    /// Rejeita arquivos vazios e acima do limite. Não faz parsing pesado (só header).
    /// </summary>
    private static bool IsValidPdf(IFormFile file, long maxBytes, out string error)
    {
        error = string.Empty;
        if (file.Length == 0)
        {
            error = "arquivo vazio.";
            return false;
        }
        if (file.Length > maxBytes)
        {
            error = $"tamanho máximo {maxBytes / (1024 * 1024)} MB.";
            return false;
        }
        var ext = System.IO.Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (ext != ".pdf")
        {
            error = "apenas arquivos PDF são aceitos.";
            return false;
        }
        if (!string.Equals(file.ContentType, "application/pdf", StringComparison.OrdinalIgnoreCase))
        {
            error = "content-type deve ser application/pdf.";
            return false;
        }
        // Magic bytes: PDF começa com %PDF-
        using var reader = file.OpenReadStream();
        Span<byte> header = stackalloc byte[5];
        var read = reader.Read(header);
        if (read < 5 || header[0] != 0x25 || header[1] != 0x50 || header[2] != 0x44 || header[3] != 0x46 || header[4] != 0x2D)
        {
            error = "assinatura PDF inválida.";
            return false;
        }
        return true;
    }

    /// <summary>
    /// Realiza login com e-mail e senha.
    /// </summary>
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(
        [FromBody] LoginRequestDto request,
        CancellationToken cancellationToken)
    {
        var validationResult = await loginValidator.ValidateAsync(request!, cancellationToken);
        if (!validationResult.IsValid)
            throw new ValidationException(validationResult.Errors);

        try
        {
            logger.LogInformation("[Auth] Login attempt");
            var response = await authService.LoginAsync(request!, cancellationToken);
            logger.LogInformation("[Auth] Login success: UserId={UserId}", response.User.Id);
            if (!string.IsNullOrEmpty(response.Token))
                SetAuthCookie(response.Token);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning("[Auth] Login denied: {Message}", ex.Message);
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[Auth] Login 500: {Type} | {Message} | Inner: {Inner}",
                ex.GetType().Name, ex.Message, ex.InnerException?.Message ?? "-");
            return StatusCode(500, new { message = "Erro ao processar login. Tente novamente." });
        }
    }

    /// <summary>
    /// Renova o access token usando um refresh token válido.
    /// Realiza rotação: gera novo access token + novo refresh token e invalida os anteriores.
    /// </summary>
    [HttpPost("refresh")]
    [EnableRateLimiting("auth-refresh")]
    public async Task<ActionResult<AuthResponseDto>> RefreshToken(
        [FromBody] RefreshTokenRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.RefreshToken))
            return BadRequest(new { message = "Refresh token é obrigatório." });

        try
        {
            var response = await authService.RefreshTokenAsync(request.RefreshToken, cancellationToken);
            if (!string.IsNullOrEmpty(response.Token))
                SetAuthCookie(response.Token);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retorna os dados do usuário autenticado.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetMe(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await authService.GetMeAsync(userId, cancellationToken);
        return Ok(user);
    }

    /// <summary>
    /// Encerra a sessão do usuário (invalida o token).
    /// Desativa push tokens do usuário ANTES de invalidar o auth token, para evitar
    /// notificações chegando no dispositivo após logout (ex.: múltiplos usuários no mesmo aparelho).
    /// </summary>
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            await pushTokenRepository.SetAllActiveForUserAsync(userId, false, cancellationToken);
        }

        // Read token from cookie (web) or Authorization header (mobile).
        // If neither is present or the header scheme is not Bearer, skip the
        // server-side revocation instead of forwarding arbitrary header content.
        var token = Request.Cookies[BearerAuthenticationHandler.AuthCookieName];
        if (string.IsNullOrWhiteSpace(token))
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                token = authHeader["Bearer ".Length..].Trim();
        }

        if (!string.IsNullOrWhiteSpace(token))
            await authService.LogoutAsync(token, cancellationToken);
        ClearAuthCookie();
        return Ok(new { message = "Logged out successfully" });
    }

    /// <summary>
    /// Autentica via Google OAuth.
    /// Se o usuário for novo, retorna profileComplete: false; o front deve exibir tela para concluir cadastro (phone, CPF, birth date).
    /// </summary>
    [EnableRateLimiting("auth")]
    [HttpPost("google")]
    public async Task<ActionResult<AuthResponseDto>> GoogleAuth(
        [FromBody] GoogleAuthRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await authService.GoogleAuthAsync(request, cancellationToken);
        if (!string.IsNullOrEmpty(response.Token))
            SetAuthCookie(response.Token);
        return Ok(response);
    }

    /// <summary>
    /// Conclui o cadastro (phone, CPF, data de nascimento) para usuários criados via Google.
    /// Só pode ser chamado uma vez; após isso profileComplete fica true.
    /// </summary>
    [Authorize]
    [HttpPatch("complete-profile")]
    public async Task<ActionResult<UserDto>> CompleteProfile(
        [FromBody] CompleteProfileRequestDto request,
        CancellationToken cancellationToken)
    {
        var validationResult = await completeProfileValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            throw new ValidationException(validationResult.Errors);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await authService.CompleteProfileAsync(userId, request, cancellationToken);
        return Ok(user);
    }

    /// <summary>
    /// Atualiza dados pessoais/endereço de um perfil já completo.
    /// Campos opcionais — só os enviados serão alterados.
    /// </summary>
    [Authorize]
    [HttpPatch("update-profile")]
    public async Task<ActionResult<UserDto>> UpdateProfile(
        [FromBody] UpdateProfileRequestDto request,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await authService.UpdateProfileAsync(userId, request, cancellationToken);
        return Ok(user);
    }

    /// <summary>
    /// Cancela o cadastro e remove o usuário (rollback). Apenas para quem ainda não concluiu o perfil (ex.: criado via Google).
    /// Após chamar, o token deixa de ser válido e o usuário é apagado.
    /// </summary>
    [Authorize]
    [HttpPost("cancel-registration")]
    public async Task<IActionResult> CancelRegistration(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        await authService.CancelRegistrationAsync(userId, cancellationToken);
        return Ok(new { message = "Registration cancelled. Account removed." });
    }

    /// <summary>
    /// Esqueci minha senha. Envia e-mail com link para redefinição (se o e-mail existir).
    /// Sempre retorna sucesso para não revelar se o e-mail está cadastrado.
    /// </summary>
    [HttpPost("forgot-password")]
    [EnableRateLimiting("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await authService.ForgotPasswordAsync(request.Email ?? "", cancellationToken);
            return Ok(new
                { message = "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha." });
        }
        catch (Exception e)
        {
            logger.LogError(e, "Auth ForgotPassword falhou");
            throw;
        }
    }

    /// <summary>
    /// Atualiza o avatar do usuário (foto de perfil). Aceita multipart/form-data com campo "avatar".
    /// </summary>
    [Authorize]
    [HttpPatch("avatar")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5 MB
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<UserDto>> UpdateAvatar(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        if (!Request.HasFormContentType || Request.Form.Files.Count == 0)
            return BadRequest(new { error = "Envie uma imagem no campo 'avatar' (multipart/form-data)." });

        var file = Request.Form.Files.GetFile("avatar") ?? Request.Form.Files[0];
        if (file.Length == 0)
            return BadRequest(new { error = "O arquivo está vazio." });
        if (file.Length > 4 * 1024 * 1024)
            return BadRequest(new { error = "A imagem deve ter no máximo 4 MB." });

        var allowed = new[] { "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif" };
        var contentType = file.ContentType ?? "image/jpeg";
        if (!allowed.Contains(contentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = $"Tipo não permitido: {contentType}. Use: JPEG, PNG, WebP ou HEIC." });

        await using var stream = file.OpenReadStream();
        if (!await FileSignatureValidator.HasValidSignatureAsync(stream, contentType))
            return BadRequest(new { error = "O conteúdo do arquivo não corresponde ao tipo declarado." });
        stream.Position = 0;
        var user = await authService.UpdateAvatarAsync(userId, stream, contentType, file.FileName, cancellationToken);
        return Ok(user);
    }

    /// <summary>
    /// Altera a senha do usuário logado (requer senha atual).
    /// </summary>
    [Authorize]
    [HttpPatch("change-password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequestDto request,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        await authService.ChangePasswordAsync(
            userId,
            request.CurrentPassword ?? "",
            request.NewPassword ?? "",
            cancellationToken);
        return Ok(new { message = "Senha alterada com sucesso." });
    }

    /// <summary>
    /// Redefine a senha usando o token recebido por e-mail.
    /// </summary>
    [EnableRateLimiting("auth")]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            await authService.ResetPasswordAsync(request.Token ?? "", request.NewPassword ?? "", cancellationToken);
            return Ok(new { message = "Senha alterada com sucesso. Faça login com a nova senha." });
        }
        catch (Exception e)
        {
            logger.LogError(e, "Auth ResetPassword falhou");
            throw;
        }
    }
}
