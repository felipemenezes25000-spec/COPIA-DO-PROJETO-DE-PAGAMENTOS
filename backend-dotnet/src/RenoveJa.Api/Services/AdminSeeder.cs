using BCrypt.Net;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Interfaces;

namespace RenoveJa.Api.Services;

/// <summary>
/// Garante que exista pelo menos um usuário com <see cref="UserRole.Admin"/>
/// no banco, lendo credenciais de variáveis de ambiente:
///
/// <list type="bullet">
///   <item><c>ADMIN_SEED_EMAIL</c>   — e-mail do admin (obrigatório para executar)</item>
///   <item><c>ADMIN_SEED_PASSWORD</c> — senha em texto plano (será hasheada com BCrypt)</item>
///   <item><c>ADMIN_SEED_NAME</c>    — nome completo (default: "Administrador RH")</item>
/// </list>
///
/// <para>
/// Comportamento (idempotente — seguro rodar a cada startup):
/// </para>
/// <list type="number">
///   <item>Se as env vars <c>ADMIN_SEED_EMAIL</c>/<c>ADMIN_SEED_PASSWORD</c> não estiverem definidas, o seeder é NO-OP (apenas loga debug).</item>
///   <item>Se o e-mail ainda não existe, cria o usuário com role Admin.</item>
///   <item>Se já existe e a role é Admin, não faz nada.</item>
///   <item>Se já existe mas a role é Patient/Doctor, <b>loga warning e aborta</b> — não promove silenciosamente para não causar escalação de privilégio acidental.</item>
/// </list>
///
/// <para>
/// Usado pelo painel RH em <c>rh.renovejasaude.com.br</c>, cujo login chama
/// <c>POST /api/auth/login</c> e em seguida <c>GET /api/admin/doctors</c>
/// (que exige <c>[Authorize(Roles = "admin")]</c>).
/// </para>
/// </summary>
public static class AdminSeeder
{
    public static async Task RunAsync(IServiceProvider services, ILogger logger, CancellationToken cancellationToken = default)
    {
        var email = Environment.GetEnvironmentVariable("ADMIN_SEED_EMAIL")?.Trim();
        var password = Environment.GetEnvironmentVariable("ADMIN_SEED_PASSWORD");
        var name = Environment.GetEnvironmentVariable("ADMIN_SEED_NAME")?.Trim();
        if (string.IsNullOrEmpty(name))
            name = "Administrador RH";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogDebug("[AdminSeeder] ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD não configurados — seeding ignorado.");
            return;
        }

        using var scope = services.CreateScope();
        var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

        var existing = await userRepository.GetByEmailAsync(email, cancellationToken);
        if (existing != null)
        {
            if (existing.Role == UserRole.Admin)
            {
                logger.LogInformation("[AdminSeeder] Admin já existe: {Email}", email);
                return;
            }

            // Não promove silenciosamente para não causar escalação de privilégio.
            logger.LogWarning(
                "[AdminSeeder] Usuário {Email} já existe com role {Role}. " +
                "Seeder NÃO promove automaticamente. " +
                "Promova manualmente no banco (UPDATE users SET role = 'Admin' WHERE email = '...') " +
                "ou use um e-mail diferente para o admin.",
                email, existing.Role);
            return;
        }

        try
        {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
            var admin = User.CreateAdmin(name, email, passwordHash);
            await userRepository.CreateAsync(admin, cancellationToken);
            logger.LogInformation("[AdminSeeder] Admin criado: {Email} (id={Id})", email, admin.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AdminSeeder] Falha ao criar admin {Email}", email);
            // Não propaga — API deve subir mesmo que o seed falhe; admin pode ser criado manualmente.
        }
    }
}
