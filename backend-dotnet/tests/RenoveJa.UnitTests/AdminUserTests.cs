using FluentAssertions;
using RenoveJa.Domain.Entities;
using RenoveJa.Domain.Enums;
using RenoveJa.Domain.Exceptions;
using Xunit;

namespace RenoveJa.UnitTests.Domain;

/// <summary>
/// Cobre <see cref="User.CreateAdmin"/> — fábrica usada pelo AdminSeeder para
/// garantir um usuário com role Admin capaz de autenticar no painel RH
/// (rh.renovejasaude.com.br) e chamar /api/admin/doctors.
/// </summary>
public class AdminUserTests
{
    private const string ValidName = "Administrador RH";
    private const string ValidEmail = "admin@renovejasaude.com.br";
    private const string ValidHash = "$2a$11$abcdefghijklmnopqrstuv"; // placeholder — CreateAdmin só checa not-empty

    [Fact]
    public void CreateAdmin_ShouldCreateUserWithAdminRole()
    {
        var admin = User.CreateAdmin(ValidName, ValidEmail, ValidHash);

        admin.Should().NotBeNull();
        admin.Role.Should().Be(UserRole.Admin);
        admin.IsAdmin().Should().BeTrue();
        admin.IsDoctor().Should().BeFalse();
        admin.IsPatient().Should().BeFalse();
    }

    [Fact]
    public void CreateAdmin_ShouldNotRequireCpfOrPhone()
    {
        var admin = User.CreateAdmin(ValidName, ValidEmail, ValidHash);

        admin.Cpf.Should().BeNull();
        admin.Phone.Should().BeNull();
    }

    [Fact]
    public void CreateAdmin_ShouldMarkProfileAsComplete()
    {
        // Admin não tem "cadastro em 2 passos" como médico/paciente via Google;
        // assim que é criado, já pode operar o painel.
        var admin = User.CreateAdmin(ValidName, ValidEmail, ValidHash);
        admin.ProfileComplete.Should().BeTrue();
    }

    [Fact]
    public void CreateAdmin_ShouldNormalizeEmail()
    {
        var admin = User.CreateAdmin(ValidName, "ADMIN@RenoveJaSaude.com.br", ValidHash);
        admin.Email.Value.Should().Be("admin@renovejasaude.com.br");
    }

    [Fact]
    public void CreateAdmin_ShouldThrow_WhenNameIsEmpty()
    {
        Action act = () => User.CreateAdmin("", ValidEmail, ValidHash);
        act.Should().Throw<DomainException>().WithMessage("*Name*");
    }

    [Fact]
    public void CreateAdmin_ShouldThrow_WhenNameHasOnlyOneWord()
    {
        Action act = () => User.CreateAdmin("Admin", ValidEmail, ValidHash);
        act.Should().Throw<DomainException>().WithMessage("*two words*");
    }

    [Fact]
    public void CreateAdmin_ShouldThrow_WhenPasswordHashIsEmpty()
    {
        Action act = () => User.CreateAdmin(ValidName, ValidEmail, "");
        act.Should().Throw<DomainException>().WithMessage("*Password hash*");
    }

    [Fact]
    public void CreateAdmin_ShouldThrow_WhenEmailIsInvalid()
    {
        Action act = () => User.CreateAdmin(ValidName, "not-an-email", ValidHash);
        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void CreateAdmin_RoleStringShouldBeAdminLowercase()
    {
        // BearerAuthenticationHandler passa user.Role.ToString().ToLowerInvariant()
        // como claim. AdminDoctorsController tem [Authorize(Roles = "admin")].
        // Garantir que o enum serializa para "admin" (case-sensitive na policy).
        var admin = User.CreateAdmin(ValidName, ValidEmail, ValidHash);
        admin.Role.ToString().ToLowerInvariant().Should().Be("admin");
    }
}
