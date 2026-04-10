namespace RenoveJa.Infrastructure.Data.Postgres;

/// <summary>
/// Configuracao de conexao com o banco de dados PostgreSQL (AWS RDS).
/// </summary>
public class DatabaseConfig
{
    /// <summary>
    /// Connection string do PostgreSQL (AWS RDS).
    /// Configurada via ConnectionStrings__DefaultConnection.
    /// </summary>
    public string? DatabaseUrl { get; set; }
}