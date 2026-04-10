namespace RenoveJa.Application.Exceptions;

/// <summary>
/// Exceção lançada quando a senha do certificado PFX é inválida.
/// </summary>
public class SignatureInvalidPfxPasswordException : Exception
{
    public SignatureInvalidPfxPasswordException()
        : base("Senha do certificado digital inválida.") { }

    public SignatureInvalidPfxPasswordException(string message)
        : base(message) { }

    public SignatureInvalidPfxPasswordException(string message, Exception innerException)
        : base(message, innerException) { }
}
