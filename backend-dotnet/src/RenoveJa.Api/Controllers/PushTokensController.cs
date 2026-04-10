using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RenoveJa.Application.DTOs.Notifications;
using RenoveJa.Application.Interfaces;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Interfaces;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace RenoveJa.Api.Controllers;

/// <summary>
/// Controller responsável por registro e remoção de tokens de push para notificações.
/// </summary>
[ApiController]
[Route("api/push-tokens")]
[Authorize]
public class PushTokensController(
    IPushTokenRepository pushTokenRepository,
    IUserPushPreferencesRepository pushPreferencesRepository,
    IPushNotificationDispatcher pushDispatcher,
    ILogger<PushTokensController> logger) : ControllerBase
{
    // Limites defensivos para o token de push.
    // Expo: ~60 chars ("ExponentPushToken[...]"); FCM: ~150-200; APNs hex: 64 ou 160.
    // 512 caracteres cobre folgadamente todos os provedores conhecidos e evita payloads absurdos.
    private const int MaxTokenLength = 512;
    private const int MinTokenLength = 20;
    private const int MaxDeviceTypeLength = 32;

    // Aceita caracteres presentes em tokens Expo/FCM/APNs (alfanumérico, '-', '_', ':', '[', ']').
    // Bloqueia espaços, quebras de linha, aspas e outros caracteres que poderiam indicar injeção.
    private static readonly Regex TokenFormatRegex = new(
        @"^[A-Za-z0-9_\-:\[\]\.]+$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly HashSet<string> AllowedDeviceTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ios", "android", "web", "unknown"
    };

    /// <summary>
    /// Registra um token de push do dispositivo do usuário.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> RegisterToken(
        [FromBody] RegisterPushTokenRequest? request,
        CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { message = "Token é obrigatório." });

        var token = request.Token.Trim();

        if (token.Length < MinTokenLength || token.Length > MaxTokenLength)
            return BadRequest(new { message = "Token com tamanho inválido." });

        if (!TokenFormatRegex.IsMatch(token))
            return BadRequest(new { message = "Token contém caracteres inválidos." });

        // Valida formato de provedor conhecido (Expo, FCM, APNs).
        // Expo: "ExponentPushToken[...]" ou "ExpoPushToken[...]".
        // FCM: string base64/hex longa (>100 chars, permitindo ':' e '_').
        // APNs: hex 64 ou 160 chars.
        bool looksLikeExpo = token.StartsWith("ExponentPushToken[", StringComparison.Ordinal)
                             || token.StartsWith("ExpoPushToken[", StringComparison.Ordinal);
        bool looksLikeApns = (token.Length == 64 || token.Length == 160)
                             && token.All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
        bool looksLikeFcm = !looksLikeExpo && !looksLikeApns && token.Length >= 100;

        if (!looksLikeExpo && !looksLikeApns && !looksLikeFcm)
            return BadRequest(new { message = "Formato de token não reconhecido (Expo/FCM/APNs)." });

        var deviceType = string.IsNullOrWhiteSpace(request.DeviceType)
            ? "unknown"
            : request.DeviceType.Trim();

        if (deviceType.Length > MaxDeviceTypeLength || !AllowedDeviceTypes.Contains(deviceType))
            return BadRequest(new { message = "DeviceType inválido. Use: ios, android, web ou unknown." });

        var userId = GetUserId();
        logger.LogInformation(
            "PushTokens RegisterToken: userId={UserId}, deviceType={DeviceType}, provider={Provider}",
            userId,
            deviceType.ToLowerInvariant(),
            looksLikeExpo ? "expo" : looksLikeApns ? "apns" : "fcm");

        // O bind explícito ao userId autenticado (e não ao body) garante que ninguém
        // possa registrar token em nome de outro usuário. O repositório ainda
        // desativa o mesmo token em outras contas (single-device-per-user).
        var pushToken = PushToken.Create(userId, token, deviceType.ToLowerInvariant());
        pushToken = await pushTokenRepository.RegisterOrUpdateAsync(pushToken, cancellationToken);

        return Ok(new
        {
            id = pushToken.Id,
            message = "Push token registered successfully"
        });
    }

    /// <summary>
    /// Remove o registro de um token de push.
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> UnregisterToken(
        [FromQuery] string? token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Token is required" });

        token = token.Trim();
        if (token.Length > MaxTokenLength || !TokenFormatRegex.IsMatch(token))
            return BadRequest(new { message = "Token inválido." });

        var userId = GetUserId();
        // DeleteByTokenAsync filtra pelo userId autenticado, impedindo desregistro cruzado.
        await pushTokenRepository.DeleteByTokenAsync(token, userId, cancellationToken);
        return Ok(new { message = "Push token unregistered successfully" });
    }

    /// <summary>
    /// Ativa ou desativa as notificações push para todos os tokens do usuário.
    /// </summary>
    [HttpPut("preference")]
    public async Task<IActionResult> SetPushPreference(
        [FromBody] PushPreferenceRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        await pushTokenRepository.SetAllActiveForUserAsync(userId, request.PushEnabled, cancellationToken);
        return Ok(new { pushEnabled = request.PushEnabled });
    }

    /// <summary>
    /// Obtém preferências por categoria (Pedidos, Consultas, Lembretes) e timezone para quiet hours.
    /// </summary>
    [HttpGet("preferences")]
    public async Task<IActionResult> GetPushPreferences(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var prefs = await pushPreferencesRepository.GetOrCreateAsync(userId, cancellationToken);
        return Ok(new
        {
            requestsEnabled = prefs.RequestsEnabled,
            consultationsEnabled = prefs.ConsultationsEnabled,
            remindersEnabled = prefs.RemindersEnabled,
            timezone = prefs.Timezone
        });
    }

    /// <summary>
    /// Atualiza preferências por categoria e timezone. Valores null mantêm o atual.
    /// </summary>
    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePushPreferences(
        [FromBody] UserPushPreferencesRequest? request,
        CancellationToken cancellationToken)
    {
        if (request == null)
            return BadRequest(new { message = "Body obrigatório." });

        // Valida timezone IANA (ex: "America/Sao_Paulo") antes de persistir, para
        // evitar que valores arbitrários/malformados vazem para o agendador de quiet hours.
        if (!string.IsNullOrWhiteSpace(request.Timezone))
        {
            if (request.Timezone.Length > 64)
                return BadRequest(new { message = "Timezone inválido." });
            try
            {
                _ = TimeZoneInfo.FindSystemTimeZoneById(request.Timezone);
            }
            catch (TimeZoneNotFoundException)
            {
                return BadRequest(new { message = $"Timezone '{request.Timezone}' não reconhecido." });
            }
            catch (InvalidTimeZoneException)
            {
                return BadRequest(new { message = $"Timezone '{request.Timezone}' inválido." });
            }
        }

        var userId = GetUserId();
        var prefs = await pushPreferencesRepository.GetOrCreateAsync(userId, cancellationToken);
        var updated = UserPushPreferences.Reconstitute(
            userId,
            request.RequestsEnabled ?? prefs.RequestsEnabled,
            request.ConsultationsEnabled ?? prefs.ConsultationsEnabled,
            request.RemindersEnabled ?? prefs.RemindersEnabled,
            request.Timezone ?? prefs.Timezone);
        await pushPreferencesRepository.UpdateAsync(updated, cancellationToken);
        return Ok(new
        {
            requestsEnabled = updated.RequestsEnabled,
            consultationsEnabled = updated.ConsultationsEnabled,
            remindersEnabled = updated.RemindersEnabled,
            timezone = updated.Timezone
        });
    }

    /// <summary>
    /// Envia um push de teste para o usuário autenticado (para validar se push está funcional).
    /// </summary>
    [HttpPost("test")]
    public async Task<IActionResult> SendTestPush(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var tokens = await pushTokenRepository.GetByUserIdAsync(userId, cancellationToken);
        if (tokens.Count == 0)
        {
            // Verificar se tem tokens inativos para dar mensagem mais útil
            var allTokens = await pushTokenRepository.GetAllByUserIdAsync(userId, cancellationToken);
            if (allTokens.Count > 0)
                return BadRequest(new { message = "Seu token de push está inativo. Saia do app, entre novamente e tente outra vez." });
            return BadRequest(new { message = "Nenhum token de push registrado. Abra o app em um dispositivo físico e aceite as permissões de notificação." });
        }

        var payload = new PushNotificationPayload(
            "test",
            "renoveja://",
            PushCategory.System,
            $"test_{Guid.NewGuid():N}",
            DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        var request = new PushNotificationRequest(userId, "Teste RenoveJá", "Se você recebeu isso, o push está funcionando.", payload);

        try
        {
            await pushDispatcher.SendAsync(request, cancellationToken);
            return Ok(new { message = "Push de teste enviado. Verifique seu dispositivo." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao enviar push de teste para userId={UserId}", userId);
            return BadRequest(new { message = "Não foi possível enviar o push de teste. Tente novamente em alguns instantes." });
        }
    }

    /// <summary>
    /// Lista os tokens de push do usuário autenticado (ativos e inativos, para exibir preferência).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMyTokens(CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var tokens = await pushTokenRepository.GetAllByUserIdAsync(userId, cancellationToken);

        return Ok(tokens.Select(t => new
        {
            id = t.Id,
            deviceType = t.DeviceType,
            active = t.Active,
            createdAt = t.CreatedAt
        }));
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID");
        return userId;
    }
}
