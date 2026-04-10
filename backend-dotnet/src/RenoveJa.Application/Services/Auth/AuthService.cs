using BCrypt.Net;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;
using RenoveJa.Application.Configuration;
using RenoveJa.Application.DTOs.Auth;
using RenoveJa.Application.Exceptions;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using Microsoft.Extensions.Logging;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Application.Services.Auth;

/// <summary>
/// Serviço de autenticação: registro, login, validação de token e perfil do usuário.
/// </summary>
public class AuthService(
    IUserRepository userRepository,
    IDoctorRepository doctorRepository,
    IAuthTokenRepository tokenRepository,
    IPasswordResetTokenRepository passwordResetTokenRepository,
    IEmailService emailService,
    IClinicalRecordService clinicalRecordService,
    IConsentRepository consentRepository,
    IStorageService storageService,
    IOptions<SmtpConfig> smtpConfig,
    IOptions<GoogleAuthConfig> googleAuthConfig,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<AuthResponseDto> RegisterAsync(
        RegisterRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (await userRepository.ExistsByEmailAsync(request.Email, cancellationToken))
            throw new AuthConflictException("Este e-mail já está cadastrado. Use outro ou faça login.");

        var cpf = request.Cpf ?? throw new ArgumentException("CPF é obrigatório.");
        var cpfDigits = new string(cpf.Where(char.IsDigit).ToArray());
        if (cpfDigits.Length == 11 && await userRepository.ExistsByCpfAsync(cpfDigits, UserRole.Patient, exceptUserId: null, cancellationToken))
            throw new AuthConflictException("Este CPF já está cadastrado como paciente. Use outro ou faça login.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = User.CreatePatient(
            request.Name, request.Email, passwordHash, cpfDigits, request.Phone, request.BirthDate,
            request.Street, request.Number, request.Neighborhood, request.Complement,
            request.City, request.State, request.PostalCode);

        user = await userRepository.CreateAsync(user, cancellationToken);

        try
        {
            var token = AuthToken.Create(user.Id);
            await tokenRepository.CreateAsync(token, cancellationToken);
            await RecordInitialConsentsWithRetryAsync(user.Id);
            return new AuthResponseDto(MapUserToDto(user), token.Token, RefreshToken: token.RefreshToken);
        }
        catch
        {
            await RollbackUserAsync(user.Id, cancellationToken);
            throw;
        }
    }

    public async Task<AuthResponseDto> RegisterDoctorAsync(
        RegisterDoctorRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (await userRepository.ExistsByEmailAsync(request.Email, cancellationToken))
            throw new AuthConflictException("Este e-mail já está cadastrado. Use outro ou faça login.");

        var cpf = request.Cpf ?? throw new ArgumentException("CPF é obrigatório.");
        var cpfDigits = new string(cpf.Where(char.IsDigit).ToArray());
        if (cpfDigits.Length == 11 && await userRepository.ExistsByCpfAsync(cpfDigits, UserRole.Doctor, exceptUserId: null, cancellationToken))
            throw new AuthConflictException("Este CPF já está cadastrado como médico. Use outro ou faça login.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = User.CreateDoctor(
            request.Name, request.Email, passwordHash, request.Phone, cpfDigits, request.BirthDate,
            request.Gender,
            request.Street, request.Number, request.Neighborhood, request.Complement,
            request.City, request.State, request.PostalCode);

        user = await userRepository.CreateAsync(user, cancellationToken);

        DoctorProfile? doctorProfile = null;
        try
        {
            doctorProfile = DoctorProfile.Create(user.Id, request.Crm, request.CrmState, request.Specialty, request.Bio);
            doctorProfile.UpdateProfile(
                professionalPhone: request.ProfessionalPhone, university: request.University,
                courses: request.Courses, hospitalsServices: request.HospitalsServices,
                professionalPostalCode: request.ProfessionalPostalCode,
                professionalStreet: request.ProfessionalStreet, professionalNumber: request.ProfessionalNumber,
                professionalNeighborhood: request.ProfessionalNeighborhood,
                professionalComplement: request.ProfessionalComplement,
                professionalCity: request.ProfessionalCity, professionalState: request.ProfessionalState,
                rqe: request.Rqe, graduationYear: request.GraduationYear);
            doctorProfile = await doctorRepository.CreateAsync(doctorProfile, cancellationToken);
        }
        catch
        {
            await RollbackUserAsync(user.Id, cancellationToken);
            throw;
        }

        // Token vazio indica que o médico precisa de aprovação antes de poder logar.
        // O frontend detecta isso via: !response.token || response.token.trim() === ''
        return new AuthResponseDto(MapUserToDto(user), string.Empty, null);
    }

    /// <summary>
    /// Onboarding de médico a partir do módulo RH Renoveja.
    /// A partir de 2026-04-07, o médico define o próprio acesso (email+senha OU Google)
    /// já no formulário do RH. O backend:
    ///   1. Se <c>GoogleIdToken</c> presente: valida o token via Google JWS, exige
    ///      que o e-mail do payload bata com <see cref="HrDoctorOnboardingRequestDto.Email"/>
    ///      (evita impersonation), e gera um hash BCrypt aleatório para o campo Senha do User
    ///      (o login será sempre via Google para esse usuário).
    ///   2. Se <c>Senha</c> presente: usa a senha informada (já validada pelo validator).
    ///   3. Delega para <see cref="RegisterDoctorAsync"/> que cria User + DoctorProfile pendente.
    /// O médico fica bloqueado de logar (<c>ApprovalStatus = Pending</c>) até o admin do RH aprovar.
    /// Endereço profissional continua pendente — é completado pelo médico depois do primeiro login
    /// (requisito da assinatura PAdES ICP-Brasil).
    /// </summary>
    public async Task<HrDoctorOnboardingResponseDto> RegisterDoctorFromHrAsync(
        HrDoctorOnboardingRequestDto request,
        CancellationToken cancellationToken = default)
    {
        string effectivePassword;
        bool viaGoogle = false;

        if (!string.IsNullOrWhiteSpace(request.GoogleIdToken))
        {
            // --- Caminho Google: valida o ID token e exige que o e-mail bata. ---
            var config = googleAuthConfig.Value;
            var clientId = config?.ClientId;
            if (string.IsNullOrWhiteSpace(clientId))
                throw new InvalidOperationException("Google:ClientId não configurado em appsettings.");

            var allowedAudiences = new List<string> { clientId.Trim() };
            if (!string.IsNullOrWhiteSpace(config?.AndroidClientId))
                allowedAudiences.Add(config.AndroidClientId.Trim());

            GoogleJsonWebSignature.Payload payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings { Audience = allowedAudiences };
                payload = await GoogleJsonWebSignature.ValidateAsync(request.GoogleIdToken, settings);
            }
            catch (InvalidJwtException ex)
            {
                logger.LogWarning(ex,
                    "[HR Onboarding] Google token inválido. Allowed audiences: {Audiences}",
                    string.Join(", ", allowedAudiences));
                throw new UnauthorizedAccessException("Token do Google inválido ou expirado.");
            }

            if (string.IsNullOrWhiteSpace(payload.Email))
                throw new UnauthorizedAccessException("Token do Google não contém e-mail.");

            if (!string.Equals(payload.Email.Trim(), request.Email?.Trim(),
                    StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning(
                    "[HR Onboarding] Email do formulário ({Form}) difere do Google ({Google}).",
                    request.Email, payload.Email);
                throw new UnauthorizedAccessException(
                    "O e-mail do formulário não corresponde à conta Google autenticada.");
            }

            // Hash aleatório — o médico fará login apenas via Google daqui pra frente.
            effectivePassword = Guid.NewGuid().ToString("N") + "Aa1!";
            viaGoogle = true;
        }
        else if (!string.IsNullOrWhiteSpace(request.Senha))
        {
            effectivePassword = request.Senha;
        }
        else
        {
            // O validator já rejeita esse caso, mas defendemos contra bypass do validator.
            throw new ArgumentException("Informe uma senha ou um token Google válido.");
        }

        var mapped = HrDoctorOnboardingMapper.ToRegisterDoctorRequest(request, effectivePassword);
        var result = await RegisterDoctorAsync(mapped, cancellationToken);

        // Busca o DoctorProfile recém-criado para ler o hr_protocol gerado pelo banco
        // (DEFAULT via SEQUENCE — 'RJ-YYYY-NNNNNN').
        string? protocolo = null;
        try
        {
            var createdProfile = await doctorRepository.GetByUserIdAsync(result.User.Id, cancellationToken);
            protocolo = createdProfile?.HrProtocol;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "[HR Onboarding] Falha ao ler protocolo gerado para {UserId}. Seguindo sem protocolo no response.",
                result.User.Id);
        }

        var message = viaGoogle
            ? "Cadastro recebido. Após aprovação do administrador do RH, você poderá acessar o app entrando com sua conta Google."
            : "Cadastro recebido. Após aprovação do administrador do RH, você poderá acessar o app com seu e-mail e senha.";

        return new HrDoctorOnboardingResponseDto(
            UserId: result.User.Id,
            Email: result.User.Email,
            ProfileComplete: false,
            Protocolo: protocolo,
            Message: message
        );
    }

    private async Task RollbackUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        try { await userRepository.DeleteAsync(userId, cancellationToken); }
        catch (Exception ex) { logger.LogError(ex, "Failed to rollback user {UserId}", userId); }
    }

    private async Task RollbackDoctorRegistrationAsync(Guid userId, Guid doctorProfileId, CancellationToken cancellationToken)
    {
        try { await doctorRepository.DeleteAsync(doctorProfileId, cancellationToken); }
        catch (Exception ex) { logger.LogError(ex, "Failed to rollback doctor profile {ProfileId}", doctorProfileId); }
        try { await userRepository.DeleteAsync(userId, cancellationToken); }
        catch (Exception ex) { logger.LogError(ex, "Failed to rollback user {UserId}", userId); }
    }

    // Dummy BCrypt hash used to equalize login timing when the e-mail does not
    // exist. Prevents user enumeration via response-time analysis. Computed once
    // per process over a random string — BCrypt.Verify will always return false
    // for any user-supplied password.
    private static readonly string DummyPasswordHash =
        BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N") + "DummyForTimingEq");

    public async Task<AuthResponseDto> LoginAsync(
        LoginRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByEmailAsync(request.Email, cancellationToken);

        // Timing-attack mitigation: always run a BCrypt verify, even if the user
        // does not exist, so the response time does not reveal whether the e-mail
        // is registered. The message is deliberately identical in both branches.
        if (user == null)
        {
            _ = VerifyPasswordAgainstHash(request.Password ?? string.Empty, DummyPasswordHash, Guid.Empty);
            throw new UnauthorizedAccessException("E-mail ou senha incorretos.");
        }
        if (!VerifyPasswordAgainstHash(request.Password, user.PasswordHash, user.Id))
            throw new UnauthorizedAccessException("E-mail ou senha incorretos.");

        // Verificar aprovação do médico ANTES de criar token (evita tokens órfãos no banco)
        DoctorProfileDto? doctorProfile = null;
        if (user.IsDoctor())
        {
            var profile = await doctorRepository.GetByUserIdAsync(user.Id, cancellationToken);
            if (profile != null)
            {
                if (profile.ApprovalStatus == Domain.Enums.DoctorApprovalStatus.Pending)
                    throw new UnauthorizedAccessException("Seu cadastro de médico está em análise. Aguarde a aprovação do administrador.");
                if (profile.ApprovalStatus == Domain.Enums.DoctorApprovalStatus.Rejected)
                    throw new UnauthorizedAccessException("Seu cadastro de médico foi reprovado. Entre em contato com o suporte.");
                doctorProfile = MapDoctorProfileToDto(profile);
            }
        }

        var token = AuthToken.Create(user.Id);
        await tokenRepository.CreateAsync(token, cancellationToken);

        return new AuthResponseDto(
            await MapUserToDtoAsync(user),
            token.Token,
            doctorProfile,
            RefreshToken: token.RefreshToken);
    }

    public async Task<UserDto> GetMeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken);
        if (user == null) throw new UnauthorizedAccessException("Sessão inválida.");
        return await MapUserToDtoAsync(user);
    }

    public async Task LogoutAsync(string token, CancellationToken cancellationToken = default)
    {
        await tokenRepository.DeleteByTokenAsync(token, cancellationToken);
    }

    public async Task<AuthResponseDto> GoogleAuthAsync(
        GoogleAuthRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var config = googleAuthConfig.Value;
        var clientId = config?.ClientId;
        if (string.IsNullOrWhiteSpace(clientId))
            throw new InvalidOperationException("Google:ClientId não configurado em appsettings.");

        var allowedAudiences = new List<string> { clientId.Trim() };
        if (!string.IsNullOrWhiteSpace(config?.AndroidClientId))
            allowedAudiences.Add(config.AndroidClientId.Trim());

        // Debug token decoding removido: vazava aud/iss em logs de produção
        // Para debug local, usar breakpoint ou condicional __DEV__

        GoogleJsonWebSignature.Payload payload;
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings { Audience = allowedAudiences };
            payload = await GoogleJsonWebSignature.ValidateAsync(request.GoogleToken, settings);
        }
        catch (InvalidJwtException ex)
        {
            logger.LogWarning("Google token validation failed (InvalidJwt): {Message}. Allowed audiences: {Audiences}", ex.Message, string.Join(", ", allowedAudiences));
            throw new UnauthorizedAccessException("Token do Google inválido ou expirado.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Google token validation unexpected error. Allowed audiences: {Audiences}", string.Join(", ", allowedAudiences));
            // Do not leak exception details to the client.
            throw new UnauthorizedAccessException("Falha ao validar token do Google.");
        }

        var email = payload.Email;
        if (string.IsNullOrWhiteSpace(email))
            throw new UnauthorizedAccessException("Token do Google não contém e-mail.");

        var name = payload.Name?.Trim() ?? payload.Email?.Split('@')[0] ?? "Usuário Google";
        var user = await userRepository.GetByEmailAsync(email, cancellationToken);
        if (user == null)
        {
            // FIX B32: Google OAuth always creates Patient accounts. Doctor registration requires CRM + admin approval.
            var role = UserRole.Patient;
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"));
            user = User.CreateFromGoogleIdentity(name, email, passwordHash, role);
            user = await userRepository.CreateAsync(user, cancellationToken);
        }

        DoctorProfileDto? doctorProfile = null;
        if (user.IsDoctor())
        {
            var profile = await doctorRepository.GetByUserIdAsync(user.Id, cancellationToken);
            if (profile != null)
            {
                if (profile.ApprovalStatus == Domain.Enums.DoctorApprovalStatus.Pending)
                    throw new UnauthorizedAccessException("Seu cadastro de médico está em análise. Aguarde a aprovação do administrador.");
                if (profile.ApprovalStatus == Domain.Enums.DoctorApprovalStatus.Rejected)
                    throw new UnauthorizedAccessException("Seu cadastro de médico foi reprovado. Entre em contato com o suporte.");
                doctorProfile = MapDoctorProfileToDto(profile);
            }
        }

        var token = AuthToken.Create(user.Id);
        await tokenRepository.CreateAsync(token, cancellationToken);

        return new AuthResponseDto(await MapUserToDtoAsync(user), token.Token, doctorProfile, user.ProfileComplete, token.RefreshToken);
    }

    public async Task<UserDto> CompleteProfileAsync(
        Guid userId, CompleteProfileRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found");
        if (user.ProfileComplete)
            throw new InvalidOperationException("Profile is already complete.");

        // CPF é obrigatório para completar o perfil — guarda antes de qualquer uso evita
        // CS8604 nas chamadas a SetContactInfo/CompleteProfile abaixo e trata a pré-condição
        // no lugar certo (entrada do método).
        if (string.IsNullOrWhiteSpace(request.Cpf))
            throw new InvalidOperationException("CPF is required to complete profile.");

        // Bloqueia CPF já usado por OUTRO usuário com a mesma role.
        // Permitido: a mesma pessoa ter um cadastro paciente E um médico (roles distintas).
        // exceptUserId garante que o próprio usuário (pós-Google) não se auto-bloqueie em retries.
        var cpfDigits = new string(request.Cpf.Where(char.IsDigit).ToArray());
        if (cpfDigits.Length == 11
            && await userRepository.ExistsByCpfAsync(cpfDigits, user.Role, exceptUserId: user.Id, cancellationToken))
        {
            var roleNome = user.IsDoctor() ? "médico" : "paciente";
            throw new AuthConflictException($"Este CPF já está cadastrado como {roleNome}. Use outro ou faça login.");
        }

        if (user.IsDoctor())
        {
            if (string.IsNullOrWhiteSpace(request.Crm) || string.IsNullOrWhiteSpace(request.CrmState) || string.IsNullOrWhiteSpace(request.Specialty))
                throw new InvalidOperationException("Doctor profile requires Crm, CrmState and Specialty.");
            if (request.Crm.Length > 20) throw new InvalidOperationException("CRM cannot exceed 20 characters.");
            if (request.CrmState.Trim().Length != 2) throw new InvalidOperationException("CrmState must be exactly 2 characters (state abbreviation).");
            if (request.Specialty.Length > 100) throw new InvalidOperationException("Specialty cannot exceed 100 characters.");
            if (!MedicalSpecialtyDisplay.IsValid(request.Specialty)) throw new InvalidOperationException("Invalid specialty. Use GET /api/specialties for valid values.");

            user.SetContactInfo(request.Phone, request.Cpf, request.BirthDate, street: request.Street, number: request.Number, neighborhood: request.Neighborhood, complement: request.Complement, city: request.City, state: request.State, postalCode: request.PostalCode);
            user = await userRepository.UpdateAsync(user, cancellationToken);
            try
            {
                var profile = DoctorProfile.Create(user.Id, request.Crm, request.CrmState, request.Specialty, request.Bio);
                await doctorRepository.CreateAsync(profile, cancellationToken);
                user.MarkProfileComplete();
                user = await userRepository.UpdateAsync(user, cancellationToken);
            }
            catch { user.MarkProfileIncomplete(); await userRepository.UpdateAsync(user, cancellationToken); throw; }
        }
        else
        {
            user.CompleteProfile(request.Phone, request.Cpf, request.BirthDate, request.Street, request.Number, request.Neighborhood, request.Complement, request.City, request.State, request.PostalCode);
            user = await userRepository.UpdateAsync(user, cancellationToken);
        }
        await RecordInitialConsentsWithRetryAsync(user.Id);
        return MapUserToDto(user);
    }

    public async Task<UserDto> UpdateProfileAsync(
        Guid userId, UpdateProfileRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found");
        if (!user.ProfileComplete)
            throw new InvalidOperationException("Profile must be completed before it can be updated. Use complete-profile first.");

        user.UpdateProfile(
            phone: request.Phone,
            birthDate: request.BirthDate,
            street: request.Street,
            number: request.Number,
            neighborhood: request.Neighborhood,
            complement: request.Complement,
            city: request.City,
            state: request.State,
            postalCode: request.PostalCode);

        user = await userRepository.UpdateAsync(user, cancellationToken);
        return MapUserToDto(user);
    }

    public async Task CancelRegistrationAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found");
        if (user.ProfileComplete)
            throw new InvalidOperationException("Cannot cancel registration: profile is already complete. Use another flow to delete account.");
        // FIX B19: Use transactional cascade delete to prevent race conditions
        // (previously, individual deletes could leave orphaned tokens/profiles on partial failure)
        await userRepository.DeleteCascadeAsync(userId, user.IsDoctor(), cancellationToken);
    }

    public async Task<(Guid UserId, string Role)> ValidateTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        // Normaliza token: trim whitespace, mas NÃO faz UnescapeDataString
        // (pode corromper tokens Base64 que contêm caracteres URL-like como + e =)
        var normalizedToken = token?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalizedToken))
            throw new UnauthorizedAccessException("Sessão expirada. Faça login novamente.");
        var authToken = await tokenRepository.GetByTokenAsync(normalizedToken, cancellationToken);
        if (authToken == null || authToken.IsExpired())
            throw new UnauthorizedAccessException("Sessão expirada. Faça login novamente.");
        var user = await userRepository.GetByIdAsync(authToken.UserId, cancellationToken);
        if (user == null) throw new UnauthorizedAccessException("Usuário não encontrado.");
        return (user.Id, user.Role.ToString().ToLowerInvariant());
    }

    public async Task ForgotPasswordAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByEmailAsync(email?.Trim() ?? "", cancellationToken);
        if (user == null) return;
        // NOTE B34: Invalidation and creation are not atomic. Concurrent calls may create multiple valid tokens.
        // Both tokens will work — the user receives two emails with valid links. Acceptable for password reset flow.
        await passwordResetTokenRepository.InvalidateByUserIdAsync(user.Id, cancellationToken);
        var resetToken = PasswordResetToken.Create(user.Id, expirationHours: 1);
        resetToken = await passwordResetTokenRepository.CreateAsync(resetToken, cancellationToken);
        var baseUrl = smtpConfig.Value.ResetPasswordBaseUrl?.TrimEnd('/') ?? "https://www.renovejasaude.com.br/recuperar-senha";
        var resetLink = $"{baseUrl}?token={Uri.EscapeDataString(resetToken.Token)}";
        await emailService.SendPasswordResetEmailAsync(user.Email.Value, user.Name, resetLink, cancellationToken);
    }

    public async Task ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token)) throw new ArgumentException("Token é obrigatório.");
        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
            throw new ArgumentException("A nova senha deve ter no mínimo 8 caracteres.");
        var rawToken = Uri.UnescapeDataString(token.Trim());
        var resetToken = await passwordResetTokenRepository.GetByTokenAsync(rawToken, cancellationToken);
        if (resetToken == null || !resetToken.IsValid())
            throw new UnauthorizedAccessException("Token inválido ou expirado. Solicite uma nova redefinição de senha.");
        var user = await userRepository.GetByIdAsync(resetToken.UserId, cancellationToken);
        if (user == null) throw new InvalidOperationException("Usuário não encontrado.");
        var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatePassword(newHash);
        await userRepository.UpdateAsync(user, cancellationToken);
        resetToken.MarkAsUsed();
        await passwordResetTokenRepository.UpdateAsync(resetToken, cancellationToken);
    }

    public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(currentPassword)) throw new ArgumentException("A senha atual é obrigatória.");
        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
            throw new ArgumentException("A nova senha deve ter no mínimo 8 caracteres.");
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("Usuário não encontrado.");
        if (!VerifyPasswordAgainstHash(currentPassword, user.PasswordHash, user.Id))
            throw new UnauthorizedAccessException("Senha atual incorreta.");
        var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatePassword(newHash);
        await userRepository.UpdateAsync(user, cancellationToken);
    }

    public async Task<UserDto> UpdateAvatarAsync(Guid userId, Stream fileStream, string contentType, string fileName, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("Usuário não encontrado.");
        if (!string.IsNullOrWhiteSpace(user.AvatarUrl))
        {
            try
            {
                var oldPath = storageService.ExtractPathFromStorageUrl(user.AvatarUrl);
                if (!string.IsNullOrEmpty(oldPath)) await storageService.DeleteAsync(oldPath, cancellationToken);
            }
            catch (Exception ex) { logger.LogWarning(ex, "Failed to delete old avatar during avatar update for user {UserId}", userId); }
        }
        var avatarUrl = await storageService.UploadAvatarAsync(fileStream, fileName, contentType, userId, cancellationToken);
        user.UpdateProfile(avatarUrl: avatarUrl);
        user = await userRepository.UpdateAsync(user, cancellationToken);
        return await MapUserToDtoAsync(user);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new UnauthorizedAccessException("Refresh token é obrigatório.");

        var authToken = await tokenRepository.GetByRefreshTokenAsync(refreshToken.Trim(), cancellationToken);
        if (authToken == null || !authToken.IsRefreshTokenValid())
            throw new UnauthorizedAccessException("Refresh token inválido ou expirado. Faça login novamente.");

        var user = await userRepository.GetByIdAsync(authToken.UserId, cancellationToken);
        if (user == null)
            throw new UnauthorizedAccessException("Usuário não encontrado.");

        // Rotate: generate new access token + new refresh token (optimistic concurrency)
        var previousRefreshToken = authToken.RefreshToken
            ?? throw new UnauthorizedAccessException("Refresh token inválido.");
        authToken.RotateTokens();
        var rotated = await tokenRepository.TryRotateAsync(authToken, previousRefreshToken, cancellationToken);
        if (rotated == null)
            throw new UnauthorizedAccessException("Token já foi rotacionado por outra requisição. Faça login novamente.");

        DoctorProfileDto? doctorProfile = null;
        if (user.IsDoctor())
        {
            var profile = await doctorRepository.GetByUserIdAsync(user.Id, cancellationToken);
            if (profile != null) doctorProfile = MapDoctorProfileToDto(profile);
        }

        return new AuthResponseDto(
            await MapUserToDtoAsync(user),
            authToken.Token,
            doctorProfile,
            user.ProfileComplete,
            authToken.RefreshToken);
    }

    /// <summary>
    /// Records LGPD consent with retry logic. Does NOT block registration on failure,
    /// but logs a CRITICAL error with full context so it can be manually reconciled.
    /// </summary>
    private async Task RecordInitialConsentsWithRetryAsync(Guid userId)
    {
        const int maxRetries = 3;
        const int delayMs = 1000;
        var consentTypes = new[] { nameof(ConsentType.PrivacyPolicy), nameof(ConsentType.Telemedicine), nameof(ConsentType.DataSharing) };

        for (var attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                await RecordInitialConsentsAsync(userId, CancellationToken.None);
                return; // success
            }
            catch (Exception ex)
            {
                if (attempt < maxRetries)
                {
                    logger.LogWarning(ex,
                        "[AUTH][LGPD] Attempt {Attempt}/{MaxRetries} failed to record consents for userId={UserId}. Retrying in {DelayMs}ms.",
                        attempt, maxRetries, userId, delayMs);
                    await Task.Delay(delayMs);
                }
                else
                {
                    logger.LogCritical(ex,
                        "[AUTH][LGPD] All {MaxRetries} attempts FAILED to record LGPD consents for userId={UserId}. " +
                        "ConsentTypes=[{ConsentTypes}]. MANUAL RECONCILIATION REQUIRED.",
                        maxRetries, userId, string.Join(", ", consentTypes));
                }
            }
        }
    }

    private async Task RecordInitialConsentsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var patient = await clinicalRecordService.EnsurePatientFromUserAsync(userId, cancellationToken);
        var now = DateTime.UtcNow;
        const string channel = "app_registration";
        const string version = "v1.0";
        var privacyConsent = ConsentRecord.Create(patient.Id, ConsentType.PrivacyPolicy, LegalBasis.ContractExecution, "Aceite da Política de Privacidade durante cadastro", now, channel, version);
        await consentRepository.CreateAsync(privacyConsent, cancellationToken);
        patient.LinkConsentRecord(privacyConsent.Id);
        var telemedicineConsent = ConsentRecord.Create(patient.Id, ConsentType.Telemedicine, LegalBasis.HealthCareProvision, "Aceite dos Termos de Uso e condições de telemedicina durante cadastro", now, channel, version);
        await consentRepository.CreateAsync(telemedicineConsent, cancellationToken);
        patient.LinkConsentRecord(telemedicineConsent.Id);
        var dataSharingConsent = ConsentRecord.Create(patient.Id, ConsentType.DataSharing, LegalBasis.HealthCareProvision, "Consentimento para compartilhamento de dados com médicos para prestação de serviço de saúde", now, channel, version);
        await consentRepository.CreateAsync(dataSharingConsent, cancellationToken);
        patient.LinkConsentRecord(dataSharingConsent.Id);
    }

    /// <summary>Presigned URL para avatar S3 privado (1h).</summary>
    private async Task<UserDto> MapUserToDtoAsync(User user)
    {
        var avatarUrl = user.AvatarUrl;
        if (!string.IsNullOrWhiteSpace(avatarUrl) && avatarUrl.Contains(".amazonaws.com"))
        {
            try
            {
                var path = storageService.ExtractPathFromStorageUrl(avatarUrl);
                if (path != null)
                {
                    var signed = await storageService.CreateSignedUrlAsync(path, 3600);
                    if (signed != null) avatarUrl = signed;
                }
            }
            catch { /* fallback to original URL */ }
        }
        var emailStr = user.Email?.Value ?? string.Empty;
        return new UserDto(user.Id, user.Name, emailStr, user.Phone?.Value, user.Cpf,
            user.BirthDate, avatarUrl, user.Role.ToString().ToLowerInvariant(),
            user.CreatedAt, user.UpdatedAt, user.ProfileComplete,
            user.Street, user.Number, user.Neighborhood, user.Complement,
            user.City, user.State, user.PostalCode);
    }

    /// <summary>
    /// Verifica senha com BCrypt. Hash inválido/vazio não deve lançar — evita 500 no login (ex.: dados legados).
    /// </summary>
    private bool VerifyPasswordAgainstHash(string password, string passwordHash, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(passwordHash)) return false;
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch (SaltParseException ex)
        {
            logger.LogWarning(ex, "Password hash inválido ou corrompido (UserId={UserId})", userId);
            return false;
        }
    }

    private static UserDto MapUserToDto(User user)
    {
        var emailStr = user.Email?.Value ?? string.Empty;
        return new UserDto(user.Id, user.Name, emailStr, user.Phone?.Value, user.Cpf,
            user.BirthDate, user.AvatarUrl, user.Role.ToString().ToLowerInvariant(),
            user.CreatedAt, user.UpdatedAt, user.ProfileComplete,
            user.Street, user.Number, user.Neighborhood, user.Complement,
            user.City, user.State, user.PostalCode);
    }

    private static DoctorProfileDto MapDoctorProfileToDto(DoctorProfile profile)
    {
        return new DoctorProfileDto(profile.Id, profile.UserId, profile.Crm, profile.CrmState,
            profile.Specialty, profile.Bio, profile.Rating, profile.TotalConsultations,
            profile.Available, profile.CreatedAt, profile.ProfessionalAddress,
            profile.ProfessionalPhone, profile.ProfessionalPostalCode, profile.ProfessionalStreet,
            profile.ProfessionalNumber, profile.ProfessionalNeighborhood,
            profile.ProfessionalComplement, profile.ProfessionalCity, profile.ProfessionalState,
            profile.University, profile.Courses, profile.HospitalsServices);
    }
}
