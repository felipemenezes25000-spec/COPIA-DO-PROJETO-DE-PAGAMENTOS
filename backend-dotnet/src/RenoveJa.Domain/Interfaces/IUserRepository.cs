using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;

namespace RenoveJa.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<User>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<List<User>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<User> CreateAsync(User user, CancellationToken cancellationToken = default);
    Task<User> UpdateAsync(User user, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    /// <summary>
    /// Deletes user and all related data (doctor profile, auth tokens) in a single transaction.
    /// Used by CancelRegistration to prevent race conditions with partial deletes.
    /// </summary>
    Task DeleteCascadeAsync(Guid userId, bool isDoctor, CancellationToken cancellationToken = default);
    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Verifica se já existe outro usuário com o mesmo CPF E a mesma role.
    /// CPF é único por (cpf, role): a mesma pessoa pode ter cadastros distintos
    /// como paciente e médico, mas não dois pacientes ou dois médicos.
    /// </summary>
    /// <param name="exceptUserId">Quando informado, ignora linhas com este id (usado em updates do próprio usuário).</param>
    Task<bool> ExistsByCpfAsync(string cpf, UserRole role, Guid? exceptUserId = null, CancellationToken cancellationToken = default);
}
