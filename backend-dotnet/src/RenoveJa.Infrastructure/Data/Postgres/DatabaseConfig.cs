namespace RenoveJa.Infrastructure.Data.Postgres;

/// <summary>
/// Configuração de conexão com o PostgreSQL (RDS AWS).
/// </summary>
public class DatabaseConfig
{
    /// <summary>
    /// Connection string do PostgreSQL.
    /// Ex: "Host=renoveja-postgres.xxx.sa-east-1.rds.amazonaws.com;Port=5432;Database=renoveja;Username=postgres;Password=xxx"
    /// </summary>
    public string ConnectionString { get; set; } = string.Empty;
}
